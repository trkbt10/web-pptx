/**
 * @file Outside marquee selection
 *
 * Handles drag-to-select from the canvas display area outside the slide surface.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import type { Shape } from "../../pptx/domain";
import type { ShapeId } from "../../pptx/domain/types";
import type { SelectionState } from "../state";
import { clientToSlideCoords } from "../shape/coords";
import { collectShapeRenderData } from "../shape/traverse";
import { colorTokens } from "../ui/design-tokens";

type OutsideMarqueeState = {
  readonly startClientX: number;
  readonly startClientY: number;
  readonly currentClientX: number;
  readonly currentClientY: number;
  readonly startSlideX: number;
  readonly startSlideY: number;
  readonly currentSlideX: number;
  readonly currentSlideY: number;
  readonly additive: boolean;
};

export type OutsideMarqueeSelectionOptions = {
  readonly enabled: boolean;
  readonly containerRef: RefObject<HTMLDivElement | null>;
  readonly canvasWrapperRef: RefObject<HTMLDivElement | null>;
  readonly slideWidth: number;
  readonly slideHeight: number;
  readonly shapes: readonly Shape[];
  readonly selection: SelectionState;
  readonly onClearSelection: () => void;
  readonly onSelectMultiple: (shapeIds: readonly ShapeId[]) => void;
};

/**
 * Hook result for outside marquee selection.
 */
export type OutsideMarqueeSelectionResult = {
  readonly marqueeStyle: CSSProperties | null;
  readonly onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
};

/**
 * Enable drag selection from the canvas display area outside the slide.
 */
export function useOutsideMarqueeSelection({
  enabled,
  containerRef,
  canvasWrapperRef,
  slideWidth,
  slideHeight,
  shapes,
  selection,
  onClearSelection,
  onSelectMultiple,
}: OutsideMarqueeSelectionOptions): OutsideMarqueeSelectionResult {
  const [marquee, setMarquee] = useState<OutsideMarqueeState | null>(null);
  const marqueeRef = useRef<OutsideMarqueeState | null>(null);
  const shapeRenderData = useMemo(() => collectShapeRenderData(shapes), [shapes]);

  const updateMarquee = useCallback(
    (event: PointerEvent) => {
      const current = marqueeRef.current;
      const canvasRect = canvasWrapperRef.current?.getBoundingClientRect();
      if (!current || !canvasRect) {
        return;
      }
      const coords = clientToSlideCoords(event.clientX, event.clientY, canvasRect, slideWidth, slideHeight);
      const next: OutsideMarqueeState = {
        ...current,
        currentClientX: event.clientX,
        currentClientY: event.clientY,
        currentSlideX: coords.x,
        currentSlideY: coords.y,
      };
      marqueeRef.current = next;
      setMarquee(next);
    },
    [canvasWrapperRef, slideWidth, slideHeight],
  );

  const finalizeMarquee = useCallback(() => {
    const current = marqueeRef.current;
    marqueeRef.current = null;
    setMarquee(null);
    if (!current) {
      return;
    }

    const dx = Math.abs(current.currentClientX - current.startClientX);
    const dy = Math.abs(current.currentClientY - current.startClientY);
    const dragged = dx > 2 || dy > 2;

    if (!dragged) {
      onClearSelection();
      return;
    }

    const rectX = Math.min(current.startSlideX, current.currentSlideX);
    const rectY = Math.min(current.startSlideY, current.currentSlideY);
    const rectW = Math.abs(current.currentSlideX - current.startSlideX);
    const rectH = Math.abs(current.currentSlideY - current.startSlideY);

    const idsInRect = shapeRenderData
      .filter((shape) => {
        const shapeRight = shape.x + shape.width;
        const shapeBottom = shape.y + shape.height;
        const rectRight = rectX + rectW;
        const rectBottom = rectY + rectH;
        return shapeRight >= rectX && shape.x <= rectRight && shapeBottom >= rectY && shape.y <= rectBottom;
      })
      .map((shape) => shape.id);

    if (idsInRect.length === 0) {
      if (!current.additive) {
        onClearSelection();
      }
      return;
    }

    if (current.additive) {
      const combinedIds = [...selection.selectedIds];
      for (const id of idsInRect) {
        if (!combinedIds.includes(id)) {
          combinedIds.push(id);
        }
      }
      onSelectMultiple(combinedIds);
      return;
    }

    onSelectMultiple(idsInRect);
  }, [onClearSelection, onSelectMultiple, selection.selectedIds, shapeRenderData]);

  useEffect(() => {
    if (!marquee) {
      return;
    }
    window.addEventListener("pointermove", updateMarquee);
    window.addEventListener("pointerup", finalizeMarquee, { once: true });
    const handlePointerCancel = () => {
      marqueeRef.current = null;
      setMarquee(null);
    };
    window.addEventListener("pointercancel", handlePointerCancel, { once: true });
    return () => {
      window.removeEventListener("pointermove", updateMarquee);
      window.removeEventListener("pointerup", finalizeMarquee);
      window.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, [marquee, updateMarquee, finalizeMarquee]);

  const marqueeStyle = useMemo<CSSProperties | null>(() => {
    if (!marquee || !containerRef.current) {
      return null;
    }
    const containerRect = containerRef.current.getBoundingClientRect();
    const left = Math.min(marquee.startClientX, marquee.currentClientX) - containerRect.left;
    const top = Math.min(marquee.startClientY, marquee.currentClientY) - containerRect.top;
    const width = Math.abs(marquee.currentClientX - marquee.startClientX);
    const height = Math.abs(marquee.currentClientY - marquee.startClientY);
    return {
      position: "absolute",
      left: left + containerRef.current.scrollLeft,
      top: top + containerRef.current.scrollTop,
      width,
      height,
      backgroundColor: colorTokens.selection.primary,
      border: `1px solid ${colorTokens.selection.primary}`,
      opacity: 0.12,
      pointerEvents: "none",
      zIndex: 4,
    };
  }, [marquee, containerRef]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled) {
        return;
      }
      if (event.button !== 0) {
        return;
      }
      const target = event.target as Node | null;
      if (target && canvasWrapperRef.current?.contains(target)) {
        return;
      }
      const canvasRect = canvasWrapperRef.current?.getBoundingClientRect();
      if (!canvasRect) {
        onClearSelection();
        return;
      }
      const coords = clientToSlideCoords(event.clientX, event.clientY, canvasRect, slideWidth, slideHeight);
      const additive = event.shiftKey || event.metaKey || event.ctrlKey;
      const next: OutsideMarqueeState = {
        startClientX: event.clientX,
        startClientY: event.clientY,
        currentClientX: event.clientX,
        currentClientY: event.clientY,
        startSlideX: coords.x,
        startSlideY: coords.y,
        currentSlideX: coords.x,
        currentSlideY: coords.y,
        additive,
      };
      marqueeRef.current = next;
      setMarquee(next);
      event.preventDefault();
    },
    [enabled, canvasWrapperRef, slideWidth, slideHeight, onClearSelection],
  );

  return { marqueeStyle, onPointerDown: handlePointerDown };
}

/**
 * @file Canvas rulers overlay
 *
 * Positions rulers relative to the centered canvas.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, type CSSProperties, type RefObject } from "react";
import { SlideRuler } from "../slide/SlideRuler";
import type { CanvasViewport } from "./use-canvas-viewport";
import type { CanvasStageMetrics } from "./canvas-metrics";

export type CanvasRulersProps = {
  readonly showRulers: boolean;
  readonly viewport: CanvasViewport;
  readonly zoom: number;
  readonly slideWidth: number;
  readonly slideHeight: number;
  readonly stageMetrics: CanvasStageMetrics;
  readonly rulerThickness: number;
  readonly scrollRef: RefObject<HTMLDivElement | null>;
};

const cornerStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  backgroundColor: "var(--bg-secondary, #1a1a1a)",
  borderRight: "1px solid var(--border-subtle, #333)",
  borderBottom: "1px solid var(--border-subtle, #333)",
};

/**
 * Ruler overlay positioned to match the canvas.
 */
export function CanvasRulers({
  showRulers,
  viewport,
  zoom,
  slideWidth,
  slideHeight,
  stageMetrics,
  rulerThickness,
  scrollRef,
}: CanvasRulersProps) {
  if (!showRulers) {
    return null;
  }

  const horizontalTrackRef = useRef<HTMLDivElement>(null);
  const verticalTrackRef = useRef<HTMLDivElement>(null);

  const updateTransforms = useCallback(() => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }
    const translateX = -container.scrollLeft + stageMetrics.canvasOffsetX;
    const translateY = -container.scrollTop + stageMetrics.canvasOffsetY;

    if (horizontalTrackRef.current) {
      horizontalTrackRef.current.style.transform = `translateX(${translateX}px)`;
    }
    if (verticalTrackRef.current) {
      verticalTrackRef.current.style.transform = `translateY(${translateY}px)`;
    }
  }, [scrollRef, stageMetrics.canvasOffsetX, stageMetrics.canvasOffsetY]);

  useLayoutEffect(() => {
    updateTransforms();
  }, [updateTransforms, viewport.width, viewport.height, zoom, slideWidth, slideHeight]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }

    container.addEventListener("scroll", updateTransforms, { passive: true });
    return () => {
      container.removeEventListener("scroll", updateTransforms);
    };
  }, [scrollRef, updateTransforms]);

  const horizontalOuterStyle: CSSProperties = {
    position: "absolute",
    top: 0,
    left: rulerThickness,
    right: 0,
    height: rulerThickness,
    overflow: "hidden",
  };

  const verticalOuterStyle: CSSProperties = {
    position: "absolute",
    top: rulerThickness,
    left: 0,
    bottom: 0,
    width: rulerThickness,
    overflow: "hidden",
  };

  return (
    <>
      <div
        style={{
          ...cornerStyle,
          width: rulerThickness,
          height: rulerThickness,
        }}
      />
      <div style={horizontalOuterStyle}>
        <div ref={horizontalTrackRef} style={{ width: slideWidth * zoom, willChange: "transform" }}>
          <SlideRuler
            orientation="horizontal"
            length={slideWidth * zoom}
            thickness={rulerThickness}
            zoom={zoom}
            offsetPx={0}
            max={slideWidth}
          />
        </div>
      </div>
      <div style={verticalOuterStyle}>
        <div ref={verticalTrackRef} style={{ height: slideHeight * zoom, willChange: "transform" }}>
          <SlideRuler
            orientation="vertical"
            length={slideHeight * zoom}
            thickness={rulerThickness}
            zoom={zoom}
            offsetPx={0}
            max={slideHeight}
          />
        </div>
      </div>
    </>
  );
}

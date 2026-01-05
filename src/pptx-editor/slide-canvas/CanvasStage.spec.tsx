/**
 * @file CanvasStage auto-centering behavior tests
 */

// @vitest-environment jsdom

import { render, act } from "@testing-library/react";
import type { Slide } from "../../pptx/domain";
import { px } from "../../pptx/domain/types";
import { createIdleDragState, createEmptySelection } from "../state";
import { createInactiveTextEditState } from "../slide/text-edit/state";
import { CanvasStage } from "./CanvasStage";

type MockResizeObserverEntry = {
  readonly callback: ResizeObserverCallback;
  readonly trigger: () => void;
};

const observers: MockResizeObserverEntry[] = [];
const originalResizeObserver = globalThis.ResizeObserver;

function triggerResizeObservers(): void {
  for (const entry of observers) {
    entry.trigger();
  }
}

function findScrollContainer(root: HTMLElement): HTMLDivElement {
  const elements = Array.from(root.querySelectorAll("div"));
  const match = elements.find(
    (el): el is HTMLDivElement => el instanceof HTMLDivElement && el.style.overflow === "auto"
  );
  if (!match) {
    throw new Error("Scroll container not found");
  }
  return match;
}

function setClientSize(element: HTMLElement, width: number, height: number): void {
  Object.defineProperty(element, "clientWidth", { value: width, configurable: true });
  Object.defineProperty(element, "clientHeight", { value: height, configurable: true });
}

describe("CanvasStage auto-centering", () => {
  afterEach(() => {
    observers.length = 0;
    globalThis.ResizeObserver = originalResizeObserver;
  });

  it("centers only once after slide selection", async () => {
    globalThis.ResizeObserver = function ResizeObserver(callback: ResizeObserverCallback): ResizeObserver {
      const entry: MockResizeObserverEntry = {
        callback,
        trigger: () => {
          callback([], resizeObserver as ResizeObserver);
        },
      };
      observers.push(entry);
      const resizeObserver: ResizeObserver = {
        observe: () => undefined,
        unobserve: () => undefined,
        disconnect: () => undefined,
      };
      return resizeObserver;
    } as typeof ResizeObserver;
    const slide: Slide = { shapes: [] };
    const selection = createEmptySelection();
    const drag = createIdleDragState();
    const textEdit = createInactiveTextEditState();

    const { container } = render(
      <CanvasStage
        slide={slide}
        slideId="slide-1"
        selection={selection}
        drag={drag}
        width={px(960)}
        height={px(540)}
        primaryShape={undefined}
        selectedShapes={[]}
        contextMenuActions={{
          hasSelection: false,
          hasClipboard: false,
          isMultiSelect: false,
          canGroup: false,
          canUngroup: false,
          canAlign: false,
          canDistribute: false,
          copy: () => undefined,
          cut: () => undefined,
          paste: () => undefined,
          duplicateSelected: () => undefined,
          deleteSelected: () => undefined,
          bringToFront: () => undefined,
          bringForward: () => undefined,
          sendBackward: () => undefined,
          sendToBack: () => undefined,
          group: () => undefined,
          ungroup: () => undefined,
          alignLeft: () => undefined,
          alignCenter: () => undefined,
          alignRight: () => undefined,
          alignTop: () => undefined,
          alignMiddle: () => undefined,
          alignBottom: () => undefined,
          distributeHorizontally: () => undefined,
          distributeVertically: () => undefined,
        }}
        creationMode={{ type: "select" }}
        textEdit={textEdit}
        onSelect={() => undefined}
        onSelectMultiple={() => undefined}
        onClearSelection={() => undefined}
        onStartMove={() => undefined}
        onStartResize={() => undefined}
        onStartRotate={() => undefined}
        onDoubleClick={() => undefined}
        onCreate={() => undefined}
        onTextEditComplete={() => undefined}
        onTextEditCancel={() => undefined}
        zoom={1}
        onZoomChange={() => undefined}
        showRulers={false}
        rulerThickness={24}
      />
    );

    const scrollContainer = findScrollContainer(container);
    setClientSize(scrollContainer, 800, 600);

    await act(async () => {
      triggerResizeObservers();
    });

    scrollContainer.scrollLeft = 300;
    scrollContainer.scrollTop = 200;

    setClientSize(scrollContainer, 780, 600);

    await act(async () => {
      triggerResizeObservers();
    });

    expect(scrollContainer.scrollLeft).toBe(300);
    expect(scrollContainer.scrollTop).toBe(200);
  });
});

/**
 * @file Slide drag-and-drop tests
 *
 * Tests for D&D logic: drag start, drag over position, drop index calculation
 */

import { describe, it, expect } from "vitest";
import type { SlideWithId } from "../presentation/types";
import { createIdleDragState } from "./types";
import {
  getDraggingIds,
  getVerticalDropPosition,
  getHorizontalDropPosition,
  calculateTargetIndex,
  isValidDrop,
  createDragStartState,
  updateDragOverState,
  isDragTarget,
  getDragPositionForSlide,
} from "./drag-drop";

// =============================================================================
// Test fixtures
// =============================================================================

function createTestSlides(count: number): readonly SlideWithId[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `slide-${i + 1}`,
    slide: { shapes: [] },
  }));
}

// =============================================================================
// Drag state
// =============================================================================

describe("createIdleDragState", () => {
  it("creates idle drag state", () => {
    const state = createIdleDragState();
    expect(state.isDragging).toBe(false);
    expect(state.draggingIds).toEqual([]);
    expect(state.targetPosition).toBeNull();
  });
});

describe("createDragStartState", () => {
  it("creates dragging state with specified IDs", () => {
    const state = createDragStartState(["slide-1", "slide-2"]);

    expect(state.isDragging).toBe(true);
    expect(state.draggingIds).toEqual(["slide-1", "slide-2"]);
    expect(state.targetPosition).toBeNull();
  });
});

// =============================================================================
// Drag start
// =============================================================================

describe("getDraggingIds", () => {
  it("drags single slide when not in selection", () => {
    const selectedIds: readonly string[] = ["slide-1"];
    const draggedSlideId = "slide-3"; // not in selection

    const result = getDraggingIds(selectedIds, draggedSlideId);

    expect(result).toEqual(["slide-3"]);
  });

  it("drags all selected slides when dragging from selection", () => {
    const selectedIds: readonly string[] = ["slide-1", "slide-2", "slide-3"];
    const draggedSlideId = "slide-2"; // in selection

    const result = getDraggingIds(selectedIds, draggedSlideId);

    expect(result).toEqual(["slide-1", "slide-2", "slide-3"]);
  });

  it("drags single slide when selection is empty", () => {
    const selectedIds: readonly string[] = [];
    const draggedSlideId = "slide-1";

    const result = getDraggingIds(selectedIds, draggedSlideId);

    expect(result).toEqual(["slide-1"]);
  });
});

// =============================================================================
// Drop position calculation
// =============================================================================

describe("getVerticalDropPosition", () => {
  it("returns 'before' when cursor is in upper half", () => {
    const rectTop = 100;
    const rectHeight = 100;
    const clientY = 140; // 40% from top = upper half

    const result = getVerticalDropPosition(clientY, rectTop, rectHeight);

    expect(result).toBe("before");
  });

  it("returns 'after' when cursor is in lower half", () => {
    const rectTop = 100;
    const rectHeight = 100;
    const clientY = 160; // 60% from top = lower half

    const result = getVerticalDropPosition(clientY, rectTop, rectHeight);

    expect(result).toBe("after");
  });

  it("returns 'before' when cursor is exactly at midpoint", () => {
    const rectTop = 100;
    const rectHeight = 100;
    const clientY = 150; // exactly at mid

    // At exactly mid, should be "before" (< not <=)
    const result = getVerticalDropPosition(clientY, rectTop, rectHeight);

    expect(result).toBe("after"); // 150 is not < 150
  });
});

describe("getHorizontalDropPosition", () => {
  it("returns 'before' when cursor is in left half", () => {
    const rectLeft = 100;
    const rectWidth = 100;
    const clientX = 140; // 40% from left = left half

    const result = getHorizontalDropPosition(clientX, rectLeft, rectWidth);

    expect(result).toBe("before");
  });

  it("returns 'after' when cursor is in right half", () => {
    const rectLeft = 100;
    const rectWidth = 100;
    const clientX = 160; // 60% from left = right half

    const result = getHorizontalDropPosition(clientX, rectLeft, rectWidth);

    expect(result).toBe("after");
  });
});

// =============================================================================
// Target index calculation
// =============================================================================

describe("calculateTargetIndex", () => {
  const slides = createTestSlides(5);
  // slides: [slide-1, slide-2, slide-3, slide-4, slide-5]
  // indices: [0, 1, 2, 3, 4]

  it("calculates target index for 'before' position", () => {
    // Dropping before slide-3 (index 2) -> target index 2
    const result = calculateTargetIndex(slides, ["slide-5"], 2, "before");

    expect(result).toBe(2);
  });

  it("calculates target index for 'after' position", () => {
    // Dropping after slide-3 (index 2) -> target index 3
    const result = calculateTargetIndex(slides, ["slide-5"], 2, "after");

    expect(result).toBe(3);
  });

  it("adjusts index when dragging from before target", () => {
    // Dragging slide-1 (index 0) to after slide-3 (index 2)
    // Raw target: 3, but since slide-1 will be removed, final target: 2
    const result = calculateTargetIndex(slides, ["slide-1"], 2, "after");

    expect(result).toBe(2);
  });

  it("does not adjust index when dragging from after target", () => {
    // Dragging slide-5 (index 4) to before slide-2 (index 1)
    // Raw target: 1, no adjustment needed
    const result = calculateTargetIndex(slides, ["slide-5"], 1, "before");

    expect(result).toBe(1);
  });

  it("adjusts for multiple slides being dragged from before", () => {
    // Dragging slides 1 and 2 (indices 0, 1) to after slide-4 (index 3)
    // Raw target: 4, adjustment: -2, final: 2
    const result = calculateTargetIndex(
      slides,
      ["slide-1", "slide-2"],
      3,
      "after"
    );

    expect(result).toBe(2);
  });

  it("handles mixed selection (some before, some after target)", () => {
    // Dragging slides 2 and 4 to after slide-3
    // slide-2 is at index 1 (before), slide-4 is at index 3 (after target)
    // Raw target: 3, adjustment: -1 (only slide-2 is before), final: 2
    const result = calculateTargetIndex(
      slides,
      ["slide-2", "slide-4"],
      2,
      "after"
    );

    expect(result).toBe(2);
  });
});

// =============================================================================
// Drop validation
// =============================================================================

describe("isValidDrop", () => {
  it("returns false when not dragging", () => {
    const dragState = createIdleDragState();

    const result = isValidDrop(dragState, "slide-2");

    expect(result).toBe(false);
  });

  it("returns false when dropping on dragged item", () => {
    const dragState = createDragStartState(["slide-2"]);

    const result = isValidDrop(dragState, "slide-2");

    expect(result).toBe(false);
  });

  it("returns true for valid drop target", () => {
    const dragState = createDragStartState(["slide-1"]);

    const result = isValidDrop(dragState, "slide-3");

    expect(result).toBe(true);
  });

  it("returns false when dropping on any slide in multi-select", () => {
    const dragState = createDragStartState(["slide-1", "slide-2", "slide-3"]);

    expect(isValidDrop(dragState, "slide-1")).toBe(false);
    expect(isValidDrop(dragState, "slide-2")).toBe(false);
    expect(isValidDrop(dragState, "slide-3")).toBe(false);
    expect(isValidDrop(dragState, "slide-4")).toBe(true);
  });
});

// =============================================================================
// Drag over state
// =============================================================================

describe("updateDragOverState", () => {
  it("sets target position for valid target", () => {
    const state = createDragStartState(["slide-1"]);
    const result = updateDragOverState(state, "slide-3", "before");

    expect(result.targetPosition).toEqual({
      slideId: "slide-3",
      position: "before",
    });
  });

  it("clears target position when over dragged item", () => {
    const state = createDragStartState(["slide-1"]);
    const result = updateDragOverState(state, "slide-1", "after");

    expect(result.targetPosition).toBeNull();
  });
});

describe("isDragTarget", () => {
  it("returns true when slide is the target", () => {
    const state = {
      ...createDragStartState(["slide-1"]),
      targetPosition: { slideId: "slide-3", position: "before" as const },
    };

    expect(isDragTarget(state, "slide-3")).toBe(true);
  });

  it("returns false when slide is not the target", () => {
    const state = {
      ...createDragStartState(["slide-1"]),
      targetPosition: { slideId: "slide-3", position: "before" as const },
    };

    expect(isDragTarget(state, "slide-2")).toBe(false);
  });

  it("returns false when no target", () => {
    const state = createDragStartState(["slide-1"]);

    expect(isDragTarget(state, "slide-2")).toBe(false);
  });
});

describe("getDragPositionForSlide", () => {
  it("returns position for target slide", () => {
    const state = {
      ...createDragStartState(["slide-1"]),
      targetPosition: { slideId: "slide-3", position: "after" as const },
    };

    expect(getDragPositionForSlide(state, "slide-3")).toBe("after");
  });

  it("returns null for non-target slide", () => {
    const state = {
      ...createDragStartState(["slide-1"]),
      targetPosition: { slideId: "slide-3", position: "after" as const },
    };

    expect(getDragPositionForSlide(state, "slide-2")).toBeNull();
  });
});

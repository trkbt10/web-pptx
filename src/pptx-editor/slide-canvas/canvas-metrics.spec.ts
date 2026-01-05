/**
 * @file Canvas metrics auto-centering tests
 */

import { getAutoCenterScroll, getCanvasStageMetrics } from "./canvas-metrics";

describe("getAutoCenterScroll", () => {
  it("returns centered scroll when current scroll differs from target", () => {
    const viewport = { width: 800, height: 600 };
    const stage = getCanvasStageMetrics(viewport, 1000, 800, 120);

    const result = getAutoCenterScroll(viewport, stage, 0, 0);

    expect(result.didCenter).toBe(true);
    expect(result.scrollLeft).toBeGreaterThan(0);
    expect(result.scrollTop).toBeGreaterThan(0);
  });

  it("preserves scroll when already centered", () => {
    const viewport = { width: 800, height: 600 };
    const stage = getCanvasStageMetrics(viewport, 1000, 800, 120);
    const centered = getAutoCenterScroll(viewport, stage, 0, 0);

    const result = getAutoCenterScroll(viewport, stage, centered.scrollLeft, centered.scrollTop);

    expect(result.didCenter).toBe(false);
    expect(result.scrollLeft).toBe(centered.scrollLeft);
    expect(result.scrollTop).toBe(centered.scrollTop);
  });
});

/**
 * @file Canvas layout metrics
 *
 * Helpers for centering the canvas in the scroll viewport.
 */

import type { CanvasViewport } from "./use-canvas-viewport";

export type CanvasStageMetrics = {
  readonly stageWidth: number;
  readonly stageHeight: number;
  readonly canvasOffsetX: number;
  readonly canvasOffsetY: number;
};

export type CanvasScrollTarget = {
  readonly scrollLeft: number;
  readonly scrollTop: number;
};

export type AutoCenterScrollResult = CanvasScrollTarget & {
  readonly didCenter: boolean;
};

/**
 * Calculate stage size and canvas offsets for centering.
 */
export function getCanvasStageMetrics(
  viewport: CanvasViewport,
  canvasWidth: number,
  canvasHeight: number,
  panMargin: number
): CanvasStageMetrics {
  const stageWidth = Math.max(canvasWidth, viewport.width) + panMargin * 2;
  const stageHeight = Math.max(canvasHeight, viewport.height) + panMargin * 2;
  const canvasOffsetX = (stageWidth - canvasWidth) / 2;
  const canvasOffsetY = (stageHeight - canvasHeight) / 2;

  return {
    stageWidth,
    stageHeight,
    canvasOffsetX,
    canvasOffsetY,
  };
}

/**
 * Scroll offsets to keep the stage centered in the viewport.
 */
export function getCenteredScrollTarget(
  viewport: CanvasViewport,
  stageMetrics: CanvasStageMetrics
): CanvasScrollTarget {
  const scrollLeft = Math.max(0, (stageMetrics.stageWidth - viewport.width) / 2);
  const scrollTop = Math.max(0, (stageMetrics.stageHeight - viewport.height) / 2);

  return { scrollLeft, scrollTop };
}

/**
 * Calculate the next scroll position when auto-centering the canvas.
 */
export function getAutoCenterScroll(
  viewport: CanvasViewport,
  stageMetrics: CanvasStageMetrics,
  currentScrollLeft: number,
  currentScrollTop: number
): AutoCenterScrollResult {
  const target = getCenteredScrollTarget(viewport, stageMetrics);
  const nextLeft = getNextAutoCenterValue(currentScrollLeft, target.scrollLeft);
  const nextTop = getNextAutoCenterValue(currentScrollTop, target.scrollTop);
  const didCenter = nextLeft !== currentScrollLeft || nextTop !== currentScrollTop;

  return { scrollLeft: nextLeft, scrollTop: nextTop, didCenter };
}

function getNextAutoCenterValue(currentValue: number, targetValue: number): number {
  if (Math.abs(currentValue - targetValue) > 1) {
    return targetValue;
  }
  return currentValue;
}

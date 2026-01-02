/**
 * @file Animation module public API
 *
 * Exports animation playback utilities for PPTX presentations.
 *
 * @example
 * ```typescript
 * import { AnimationPlayer, createPlayer, extractShapeIds } from './animation';
 *
 * const player = createPlayer({
 *   findElement: (id) => document.querySelector(`[data-ooxml-id="${id}"]`),
 *   onLog: console.log,
 * });
 *
 * const shapeIds = extractShapeIds(timing);
 * player.hideAll(shapeIds);
 * await player.play(timing);
 * ```
 */

// Types
export type {
  AnimationTarget,
  EffectConfig,
  EffectDirection,
  EffectType,
  ElementFinder,
  KeyframeValue,
  PlayerOptions,
  PlayerState,
  PropertyAnimation,
} from "./types";

// Effects - All MS-OE376 Part 4 Section 4.6.3 filters
export {
  applyEffect,
  applyFade,
  applySlide,
  applyWipe,
  applyBlinds,
  applyBox,
  applyCheckerboard,
  applyCircle,
  applyDiamond,
  applyDissolve,
  applyStrips,
  applyWheel,
  applyPlus,
  applyBarn,
  applyRandombar,
  applyWedge,
  hideElement,
  parseFilterDirection,
  parseFilterToEffectType,
  resetElementStyles,
  showElement,
} from "./effects";

// Player
export type { AnimationPlayerInstance } from "./player";
export { createPlayer, extractShapeIds } from "./player";

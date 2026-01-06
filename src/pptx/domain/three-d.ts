/**
 * @file 3D rendering types for PPTX processing
 *
 * @see ECMA-376 Part 1, Section 20.1.5 - 3D Rendering
 */

import type { Fill } from "./color";
import type { Point } from "./geometry";
import type { Degrees, Percent, Pixels } from "./types";

// =============================================================================
// 3D Enumeration Types
// =============================================================================

/**
 * Light rig direction
 * @see ECMA-376 Part 1, Section 20.1.10.29 (ST_LightRigDirection)
 */
export type LightRigDirection =
  | "b"
  | "bl"
  | "br"
  | "l"
  | "r"
  | "t"
  | "tl"
  | "tr";

/**
 * Light rig preset type
 * @see ECMA-376 Part 1, Section 20.1.10.30 (ST_LightRigType)
 */
export type LightRigType =
  | "balanced"
  | "brightRoom"
  | "chilly"
  | "contrasting"
  | "flat"
  | "flood"
  | "freezing"
  | "glow"
  | "harsh"
  | "legacyFlat1"
  | "legacyFlat2"
  | "legacyFlat3"
  | "legacyFlat4"
  | "legacyHarsh1"
  | "legacyHarsh2"
  | "legacyHarsh3"
  | "legacyHarsh4"
  | "legacyNormal1"
  | "legacyNormal2"
  | "legacyNormal3"
  | "legacyNormal4"
  | "morning"
  | "soft"
  | "sunrise"
  | "sunset"
  | "threePt"
  | "twoPt";

/**
 * Camera preset type
 * @see ECMA-376 Part 1, Section 20.1.10.47 (ST_PresetCameraType)
 */
export type PresetCameraType =
  | "isometricBottomDown"
  | "isometricBottomUp"
  | "isometricLeftDown"
  | "isometricLeftUp"
  | "isometricOffAxis1Left"
  | "isometricOffAxis1Right"
  | "isometricOffAxis1Top"
  | "isometricOffAxis2Left"
  | "isometricOffAxis2Right"
  | "isometricOffAxis2Top"
  | "isometricOffAxis3Bottom"
  | "isometricOffAxis3Left"
  | "isometricOffAxis3Right"
  | "isometricOffAxis4Bottom"
  | "isometricOffAxis4Left"
  | "isometricOffAxis4Right"
  | "isometricRightDown"
  | "isometricRightUp"
  | "isometricTopDown"
  | "isometricTopUp"
  | "legacyObliqueBottom"
  | "legacyObliqueBottomLeft"
  | "legacyObliqueBottomRight"
  | "legacyObliqueFront"
  | "legacyObliqueLeft"
  | "legacyObliqueRight"
  | "legacyObliqueTop"
  | "legacyObliqueTopLeft"
  | "legacyObliqueTopRight"
  | "legacyPerspectiveBottom"
  | "legacyPerspectiveBottomLeft"
  | "legacyPerspectiveBottomRight"
  | "legacyPerspectiveFront"
  | "legacyPerspectiveLeft"
  | "legacyPerspectiveRight"
  | "legacyPerspectiveTop"
  | "legacyPerspectiveTopLeft"
  | "legacyPerspectiveTopRight"
  | "obliqueBottom"
  | "obliqueBottomLeft"
  | "obliqueBottomRight"
  | "obliqueLeft"
  | "obliqueRight"
  | "obliqueTop"
  | "obliqueTopLeft"
  | "obliqueTopRight"
  | "orthographicFront"
  | "perspectiveAbove"
  | "perspectiveAboveLeftFacing"
  | "perspectiveAboveRightFacing"
  | "perspectiveBelow"
  | "perspectiveContrastingLeftFacing"
  | "perspectiveContrastingRightFacing"
  | "perspectiveFront"
  | "perspectiveHeroicExtremeLeftFacing"
  | "perspectiveHeroicExtremeRightFacing"
  | "perspectiveHeroicLeftFacing"
  | "perspectiveHeroicRightFacing"
  | "perspectiveLeft"
  | "perspectiveRelaxed"
  | "perspectiveRelaxedModerately"
  | "perspectiveRight";

/**
 * Preset material type
 * @see ECMA-376 Part 1, Section 20.1.10.50 (ST_PresetMaterialType)
 */
export type PresetMaterialType =
  | "clear"
  | "dkEdge"
  | "flat"
  | "legacyMatte"
  | "legacyMetal"
  | "legacyPlastic"
  | "legacyWireframe"
  | "matte"
  | "metal"
  | "plastic"
  | "powder"
  | "softEdge"
  | "softmetal"
  | "translucentPowder"
  | "warmMatte";

/**
 * Bevel preset types.
 * @see ECMA-376 Part 1, Section 20.1.10.9 (ST_BevelPresetType)
 */
export type BevelPresetType =
  | "angle"
  | "artDeco"
  | "circle"
  | "convex"
  | "coolSlant"
  | "cross"
  | "divot"
  | "hardEdge"
  | "relaxedInset"
  | "riblet"
  | "slope"
  | "softRound";

// =============================================================================
// 3D Structure Types
// =============================================================================

/**
 * 3D rotation
 * @see ECMA-376 Part 1, Section 20.1.5.7 (rot)
 */
export type Rotation3d = {
  readonly latitude: Degrees;
  readonly longitude: Degrees;
  readonly revolution: Degrees;
};

/**
 * 3D camera
 * @see ECMA-376 Part 1, Section 20.1.5.2 (camera)
 */
export type Camera3d = {
  readonly preset: PresetCameraType;
  readonly fov?: Degrees;
  readonly zoom?: Percent;
  readonly rotation?: Rotation3d;
};

/**
 * 3D light rig
 * @see ECMA-376 Part 1, Section 20.1.5.6 (lightRig)
 */
export type LightRig = {
  readonly rig: LightRigType;
  readonly direction: LightRigDirection;
  readonly rotation?: Rotation3d;
};

/**
 * 3D backdrop
 * @see ECMA-376 Part 1, Section 20.1.5.3 (backdrop)
 */
export type Backdrop3d = {
  readonly anchor: Point;
  readonly normal: Point;
  readonly up: Point;
};

/**
 * 3D scene properties
 * @see ECMA-376 Part 1, Section 20.1.5.8 (scene3d)
 */
export type Scene3d = {
  readonly camera: Camera3d;
  readonly lightRig: LightRig;
  readonly backdrop?: Backdrop3d;
  readonly flatTextZ?: Pixels;
};

/**
 * 3D bevel
 * @see ECMA-376 Part 1, Section 20.1.5.1 (bevelT/bevelB)
 */
export type Bevel3d = {
  readonly width: Pixels;
  readonly height: Pixels;
  readonly preset: BevelPresetType;
};

/**
 * 3D shape properties
 * @see ECMA-376 Part 1, Section 20.1.5.9 (sp3d)
 */
export type Shape3d = {
  readonly z?: Pixels;
  readonly extrusionHeight?: Pixels;
  readonly contourWidth?: Pixels;
  readonly preset?: PresetMaterialType;
  readonly extrusionColor?: Fill;
  readonly contourColor?: Fill;
  readonly bevel?: Bevel3d;
};

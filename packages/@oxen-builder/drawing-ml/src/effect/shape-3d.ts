/**
 * @file 3D shape property builders for DrawingML
 */

import type { Pixels } from "@oxen-office/drawing-ml/domain/units";
import type { Shape3dSpec, BevelSpec } from "../types";

/**
 * 3D bevel domain type
 */
export type Bevel3d = {
  readonly preset: string;
  readonly width: Pixels;
  readonly height: Pixels;
};

/**
 * 3D shape domain type
 */
export type Shape3d = {
  readonly bevelTop?: Bevel3d;
  readonly bevelBottom?: Bevel3d;
  readonly preset?: string;
  readonly extrusionHeight?: Pixels;
};

/**
 * Build 3D bevel from spec
 */
export function buildBevel(spec: BevelSpec): Bevel3d {
  return {
    preset: spec.preset ?? "circle",
    width: (spec.width ?? 8) as Pixels,
    height: (spec.height ?? 8) as Pixels,
  };
}

/**
 * Build 3D shape properties from spec
 */
export function buildShape3d(spec: Shape3dSpec): Shape3d {
  const shape3d: Shape3d = {};

  if (spec.bevelTop) {
    (shape3d as { bevelTop?: Bevel3d }).bevelTop = buildBevel(spec.bevelTop);
  }

  if (spec.bevelBottom) {
    (shape3d as { bevelBottom?: Bevel3d }).bevelBottom = buildBevel(spec.bevelBottom);
  }

  if (spec.material) {
    (shape3d as { preset?: string }).preset = spec.material;
  }

  if (spec.extrusionHeight !== undefined) {
    (shape3d as { extrusionHeight?: Pixels }).extrusionHeight = spec.extrusionHeight as Pixels;
  }

  return shape3d;
}

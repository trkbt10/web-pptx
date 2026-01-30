/**
 * @file Line building utilities for PPTX shapes
 */

import type { Line } from "@oxen-office/pptx/domain/color/types";
import type { Pixels } from "@oxen-office/ooxml/domain/units";
import type {
  LineDashStyle,
  LineCapStyle,
  LineJoinStyle,
  LineCompoundStyle,
  LineEndSpec,
  ColorSpec,
} from "./types";
import { buildColor } from "./fill-builder";

/**
 * Line end type mapping
 */
const LINE_END_TYPE_MAP: Record<string, string> = {
  none: "none",
  triangle: "triangle",
  stealth: "stealth",
  diamond: "diamond",
  oval: "oval",
  arrow: "arrow",
};

/**
 * Line end size mapping
 */
const LINE_END_SIZE_MAP: Record<string, string> = {
  sm: "sm",
  med: "med",
  lg: "lg",
};

/**
 * Build a line end object
 */
export function buildLineEnd(spec: LineEndSpec): Line["headEnd"] {
  return {
    type: LINE_END_TYPE_MAP[spec.type] ?? "none",
    width: LINE_END_SIZE_MAP[spec.width ?? "med"] ?? "med",
    length: LINE_END_SIZE_MAP[spec.length ?? "med"] ?? "med",
  } as Line["headEnd"];
}

/**
 * Map compound style from user-friendly names to OOXML values
 */
const COMPOUND_MAP: Record<LineCompoundStyle, string> = {
  single: "sng",
  double: "dbl",
  thickThin: "thickThin",
  thinThick: "thinThick",
  triple: "tri",
};

/**
 * Build a line object with extended properties (hex color)
 */
export function buildLine(
  lineColor: string,
  lineWidth: number,
  options?: {
    dash?: LineDashStyle;
    cap?: LineCapStyle;
    join?: LineJoinStyle;
    compound?: LineCompoundStyle;
    headEnd?: LineEndSpec;
    tailEnd?: LineEndSpec;
  },
): Line {
  const compound = options?.compound ? COMPOUND_MAP[options.compound] : "sng";
  return {
    width: lineWidth as Pixels,
    cap: (options?.cap ?? "flat") as Line["cap"],
    compound: compound as Line["compound"],
    alignment: "ctr",
    fill: { type: "solidFill", color: { spec: { type: "srgb", value: lineColor } } },
    dash: (options?.dash ?? "solid") as Line["dash"],
    join: (options?.join ?? "round") as Line["join"],
    headEnd: options?.headEnd ? buildLineEnd(options.headEnd) : undefined,
    tailEnd: options?.tailEnd ? buildLineEnd(options.tailEnd) : undefined,
  };
}

/**
 * Build a line object with ColorSpec support (hex or theme color)
 */
export function buildLineFromSpec(
  lineColor: ColorSpec,
  lineWidth: number,
  options?: {
    dash?: LineDashStyle;
    cap?: LineCapStyle;
    join?: LineJoinStyle;
    compound?: LineCompoundStyle;
    headEnd?: LineEndSpec;
    tailEnd?: LineEndSpec;
  },
): Line {
  const compound = options?.compound ? COMPOUND_MAP[options.compound] : "sng";
  return {
    width: lineWidth as Pixels,
    cap: (options?.cap ?? "flat") as Line["cap"],
    compound: compound as Line["compound"],
    alignment: "ctr",
    fill: { type: "solidFill", color: buildColor(lineColor) },
    dash: (options?.dash ?? "solid") as Line["dash"],
    join: (options?.join ?? "round") as Line["join"],
    headEnd: options?.headEnd ? buildLineEnd(options.headEnd) : undefined,
    tailEnd: options?.tailEnd ? buildLineEnd(options.tailEnd) : undefined,
  };
}

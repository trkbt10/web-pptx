/**
 * @file SVG element builder
 * SVG-specific element creation extending markup base
 */

import type { MarkupString, MarkupChild, ElementProps } from "../markup";
import { createElementFactory, type MarkupConfig } from "../markup";

/**
 * SVG void (self-closing) elements.
 * These elements cannot have children and are rendered as <element ... />
 */
const SVG_VOID_ELEMENTS: ReadonlySet<string> = new Set([
  "circle",
  "ellipse",
  "line",
  "path",
  "polygon",
  "polyline",
  "rect",
  "use",
  "image",
  "animate",
  "animateMotion",
  "animateTransform",
  "set",
  "stop",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feConvolveMatrix",
  "feDiffuseLighting",
  "feDisplacementMap",
  "feDistantLight",
  "feFlood",
  "feFuncA",
  "feFuncB",
  "feFuncG",
  "feFuncR",
  "feGaussianBlur",
  "feImage",
  "feMergeNode",
  "feMorphology",
  "feOffset",
  "fePointLight",
  "feSpecularLighting",
  "feSpotLight",
  "feTile",
  "feTurbulence",
]);

/**
 * SVG element configuration.
 */
const SVG_CONFIG: MarkupConfig = {
  voidElements: SVG_VOID_ELEMENTS,
  attrTransforms: {},
};

/**
 * Create an SVG element.
 * Automatically handles void elements (self-closing).
 *
 * @example
 * ```ts
 * const rect = createSvgElement("rect", { x: "0", y: "0", width: "100", height: "50", fill: "red" });
 * // => <rect x='0' y='0' width='100' height='50' fill='red' />
 *
 * const g = createSvgElement("g", { transform: "translate(10, 10)" }, rect);
 * // => <g transform='translate(10, 10)'><rect ... /></g>
 * ```
 */
export const createSvgElement: (
  type: string,
  props: ElementProps | null,
  ...children: MarkupChild[]
) => MarkupString = createElementFactory(SVG_CONFIG);

/**
 * Create a complete SVG document with xmlns.
 *
 * @example
 * ```ts
 * const svg = createSvg({ width: "100", height: "100" }, rect);
 * // => <svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'>...</svg>
 * ```
 */
export function createSvg(
  props: ElementProps | null,
  ...children: MarkupChild[]
): MarkupString {
  const fullProps: ElementProps = {
    xmlns: "http://www.w3.org/2000/svg",
    ...props,
  };
  return createSvgElement("svg", fullProps, ...children);
}

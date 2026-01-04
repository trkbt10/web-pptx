/**
 * @file Run properties to CSS style conversion
 *
 * Converts PPTX RunProperties to CSS style strings.
 * Properly resolves scheme colors using ColorContext.
 */

import type { RunProperties, Color } from "../../../pptx/domain";
import type { ColorContext, FontScheme } from "../../../pptx/domain/resolution";
import { resolveColor } from "../../../pptx/core/dml/render/color";
import { resolveThemeFont } from "../../../pptx/domain/resolution";

// =============================================================================
// Types
// =============================================================================

/**
 * Context for style resolution
 */
export type StyleResolutionContext = {
  readonly colorContext?: ColorContext;
  readonly fontScheme?: FontScheme;
};

// =============================================================================
// Color Resolution
// =============================================================================

/**
 * Convert Color to CSS color string using full resolution.
 * Properly resolves scheme colors using ColorContext.
 */
function colorToCss(color: Color, context: StyleResolutionContext): string | undefined {
  const hex = resolveColor(color, context.colorContext);
  if (hex === undefined) {
    return undefined;
  }

  // Apply alpha if present
  const alpha = color.transform?.alpha !== undefined ? color.transform.alpha / 100 : 1;
  if (alpha < 1) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  return `#${hex}`;
}

// =============================================================================
// Style Building
// =============================================================================

type StyleEntry = {
  readonly property: string;
  readonly value: string;
};

function buildStyleEntries(
  props: RunProperties,
  context: StyleResolutionContext,
): readonly StyleEntry[] {
  const entries: StyleEntry[] = [];

  // Font size
  if (props.fontSize !== undefined) {
    entries.push({ property: "font-size", value: `${props.fontSize}pt` });
  }

  // Bold
  if (props.bold) {
    entries.push({ property: "font-weight", value: "bold" });
  }

  // Italic
  if (props.italic) {
    entries.push({ property: "font-style", value: "italic" });
  }

  // Underline
  if (props.underline && props.underline !== "none") {
    entries.push({ property: "text-decoration", value: "underline" });
  }

  // Strike
  if (props.strike && props.strike !== "noStrike") {
    const existing = entries.find((e) => e.property === "text-decoration");
    if (existing) {
      // Combine with underline
      entries.push({
        property: "text-decoration",
        value: existing.value + " line-through",
      });
    } else {
      entries.push({ property: "text-decoration", value: "line-through" });
    }
  }

  // Color - now properly resolves scheme colors
  if (props.color) {
    const cssColor = colorToCss(props.color, context);
    if (cssColor) {
      entries.push({ property: "color", value: cssColor });
    }
  }

  // Font family - resolve theme fonts
  if (props.fontFamily) {
    const resolvedFont = resolveThemeFont(props.fontFamily, context.fontScheme) ?? props.fontFamily;
    entries.push({ property: "font-family", value: `"${resolvedFont}"` });
  }

  // Caps
  if (props.caps === "all") {
    entries.push({ property: "text-transform", value: "uppercase" });
  } else if (props.caps === "small") {
    entries.push({ property: "font-variant", value: "small-caps" });
  }

  // Baseline (superscript/subscript)
  if (props.baseline !== undefined && props.baseline !== 0) {
    if (props.baseline > 0) {
      entries.push({ property: "vertical-align", value: "super" });
      entries.push({ property: "font-size", value: "smaller" });
    } else {
      entries.push({ property: "vertical-align", value: "sub" });
      entries.push({ property: "font-size", value: "smaller" });
    }
  }

  return entries;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Convert RunProperties to CSS style string.
 * Uses ColorContext for proper scheme color resolution.
 */
export function runPropertiesToStyle(
  props: RunProperties,
  context: StyleResolutionContext = {},
): string {
  const entries = buildStyleEntries(props, context);
  if (entries.length === 0) {
    return "";
  }
  return entries.map((e) => `${e.property}: ${e.value}`).join("; ");
}

/**
 * Convert RunProperties to style object for React.
 * Uses ColorContext for proper scheme color resolution.
 */
export function runPropertiesToStyleObject(
  props: RunProperties,
  context: StyleResolutionContext = {},
): Record<string, string> {
  const entries = buildStyleEntries(props, context);
  const result: Record<string, string> = {};

  for (const entry of entries) {
    // Convert kebab-case to camelCase
    const camelCase = entry.property.replace(/-([a-z])/g, (_, letter) =>
      letter.toUpperCase(),
    );
    result[camelCase] = entry.value;
  }

  return result;
}

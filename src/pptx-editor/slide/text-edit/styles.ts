/**
 * @file Run properties to CSS style conversion
 *
 * Converts PPTX RunProperties to CSS style strings.
 */

import type { RunProperties, Color } from "../../../pptx/domain";

// =============================================================================
// Color Resolution
// =============================================================================

/**
 * Convert Color to CSS color string
 * Simplified version - full resolution would require theme context
 */
function colorToCss(color: Color): string | undefined {
  const spec = color.spec;
  switch (spec.type) {
    case "srgb":
      return `#${spec.value}`;
    case "preset":
      return spec.value;
    case "scheme":
      // Scheme colors need theme context - return a fallback
      return undefined;
    case "system":
      return spec.lastColor ? `#${spec.lastColor}` : undefined;
    case "hsl":
      // HSL to CSS
      return `hsl(${spec.hue}, ${spec.saturation}%, ${spec.luminance}%)`;
  }
}

// =============================================================================
// Style Building
// =============================================================================

type StyleEntry = {
  readonly property: string;
  readonly value: string;
};

function buildStyleEntries(props: RunProperties): readonly StyleEntry[] {
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
        value: existing.value + " line-through"
      });
    } else {
      entries.push({ property: "text-decoration", value: "line-through" });
    }
  }

  // Color
  if (props.color) {
    const cssColor = colorToCss(props.color);
    if (cssColor) {
      entries.push({ property: "color", value: cssColor });
    }
  }

  // Font family
  if (props.fontFamily) {
    entries.push({ property: "font-family", value: `"${props.fontFamily}"` });
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
 * Convert RunProperties to CSS style string
 */
export function runPropertiesToStyle(props: RunProperties): string {
  const entries = buildStyleEntries(props);
  if (entries.length === 0) {
    return "";
  }
  return entries.map((e) => `${e.property}: ${e.value}`).join("; ");
}

/**
 * Convert RunProperties to style object for React
 */
export function runPropertiesToStyleObject(
  props: RunProperties
): Record<string, string> {
  const entries = buildStyleEntries(props);
  const result: Record<string, string> = {};

  for (const entry of entries) {
    // Convert kebab-case to camelCase
    const camelCase = entry.property.replace(/-([a-z])/g, (_, letter) =>
      letter.toUpperCase()
    );
    result[camelCase] = entry.value;
  }

  return result;
}

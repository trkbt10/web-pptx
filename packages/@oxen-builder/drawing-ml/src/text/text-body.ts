/**
 * @file Text body builder for DrawingML
 *
 * Builds text body structures that are common across PPTX, DOCX, and XLSX.
 * The output is compatible with @oxen-office/pptx text domain types.
 */

import type { Pixels } from "@oxen-office/drawing-ml/domain/units";
import type { SolidFill } from "@oxen-office/drawing-ml/domain/fill";
import type { BaseLine } from "@oxen-office/drawing-ml/domain/line";
import type { Effects } from "@oxen-office/drawing-ml/domain/effects";
import type {
  TextSpec,
  TextParagraphSpec,
  TextRunSpec,
  TextBodyPropertiesSpec,
  HyperlinkSpec,
  RichTextSpec,
} from "../types";
import { buildSolidFill } from "../fill/solid-fill";
import { buildLine } from "../line/line-properties";
import { buildEffects } from "../effect/effects";

// =============================================================================
// Domain Types (compatible with @oxen-office/pptx)
// =============================================================================

/**
 * Text body domain type
 */
export type TextBody = {
  readonly bodyProperties: BodyProperties;
  readonly paragraphs: readonly Paragraph[];
};

/**
 * Body properties domain type
 */
export type BodyProperties = {
  readonly anchor?: string;
  readonly verticalType?: string;
  readonly wrapping?: string;
  readonly anchorCenter?: boolean;
  readonly insets?: {
    readonly left: Pixels;
    readonly top: Pixels;
    readonly right: Pixels;
    readonly bottom: Pixels;
  };
};

/**
 * Paragraph domain type
 */
export type Paragraph = {
  readonly properties: ParagraphProperties;
  readonly runs: readonly TextRun[];
};

/**
 * Paragraph properties domain type
 */
export type ParagraphProperties = {
  readonly level?: number;
  readonly alignment?: string;
  readonly bulletStyle?: BulletStyle;
  readonly lineSpacing?: LineSpacing;
  readonly spaceBefore?: number;
  readonly spaceAfter?: number;
  readonly indent?: Pixels;
  readonly marginLeft?: Pixels;
  readonly defaultRunProperties?: RunProperties;
};

/**
 * Bullet style domain type
 */
export type BulletStyle = {
  readonly bullet: Bullet;
  readonly colorFollowText: boolean;
  readonly sizeFollowText: boolean;
  readonly fontFollowText: boolean;
};

/**
 * Bullet domain type
 */
export type Bullet =
  | { readonly type: "none" }
  | { readonly type: "char"; readonly char: string }
  | { readonly type: "auto"; readonly scheme: string };

/**
 * Line spacing domain type
 */
export type LineSpacing =
  | { readonly type: "percent"; readonly value: number }
  | { readonly type: "points"; readonly value: number };

/**
 * Text run domain type
 */
export type TextRun = {
  readonly type: "text";
  readonly text: string;
  readonly properties?: RunProperties;
};

/**
 * Run properties domain type
 */
export type RunProperties = {
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly underline?: string;
  readonly strike?: string;
  readonly caps?: string;
  readonly baseline?: number;
  readonly spacing?: Pixels;
  readonly fontSize?: number;
  readonly fontFamily?: string;
  readonly solidFill?: SolidFill;
  readonly textOutline?: BaseLine;
  readonly effects?: Effects;
  readonly hyperlink?: Hyperlink;
};

/**
 * Hyperlink domain type
 */
export type Hyperlink = {
  readonly id: string;
  readonly tooltip?: string;
};

// =============================================================================
// Mapping Constants
// =============================================================================

/**
 * Map underline style to OOXML values
 */
const UNDERLINE_MAP: Record<string, string> = {
  none: "none",
  single: "sng",
  double: "dbl",
  heavy: "heavy",
  dotted: "dotted",
  dashed: "dash",
  wavy: "wavy",
};

/**
 * Map strikethrough style to OOXML values
 */
const STRIKE_MAP: Record<string, string> = {
  none: "noStrike",
  single: "sngStrike",
  double: "dblStrike",
};

/**
 * Map vertical position to baseline percentage
 */
const VERTICAL_POSITION_MAP: Record<string, number> = {
  normal: 0,
  superscript: 30,
  subscript: -25,
};

// =============================================================================
// Hyperlink Info Type
// =============================================================================

/**
 * Hyperlink info collected during text building
 */
export type HyperlinkInfo = {
  readonly url: string;
  readonly tooltip?: string;
};

// =============================================================================
// Builder Functions
// =============================================================================

/**
 * Build hyperlink domain object from spec using placeholder ID
 */
function buildHyperlink(spec: HyperlinkSpec): Hyperlink {
  return {
    id: spec.url, // Placeholder - URL stored here, will be replaced with rId
    tooltip: spec.tooltip,
  };
}

/**
 * Build run properties from spec
 */
function buildRunProperties(spec: TextRunSpec): RunProperties | undefined {
  if (
    spec.bold !== undefined ||
    spec.italic !== undefined ||
    spec.underline !== undefined ||
    spec.strikethrough !== undefined ||
    spec.caps !== undefined ||
    spec.verticalPosition !== undefined ||
    spec.letterSpacing !== undefined ||
    spec.fontSize !== undefined ||
    spec.fontFamily !== undefined ||
    spec.color !== undefined ||
    spec.outline !== undefined ||
    spec.effects !== undefined ||
    spec.hyperlink !== undefined
  ) {
    const properties: RunProperties = {};

    if (spec.bold !== undefined) {
      (properties as { bold?: boolean }).bold = spec.bold;
    }
    if (spec.italic !== undefined) {
      (properties as { italic?: boolean }).italic = spec.italic;
    }
    if (spec.underline && spec.underline !== "none") {
      (properties as { underline?: string }).underline = UNDERLINE_MAP[spec.underline] ?? spec.underline;
    }
    if (spec.strikethrough && spec.strikethrough !== "noStrike") {
      (properties as { strike?: string }).strike = STRIKE_MAP[spec.strikethrough];
    }
    if (spec.caps && spec.caps !== "none") {
      (properties as { caps?: string }).caps = spec.caps;
    }
    if (spec.verticalPosition && spec.verticalPosition !== "normal") {
      (properties as { baseline?: number }).baseline = VERTICAL_POSITION_MAP[spec.verticalPosition];
    }
    if (spec.letterSpacing !== undefined) {
      (properties as { spacing?: Pixels }).spacing = spec.letterSpacing as Pixels;
    }
    if (spec.fontSize !== undefined) {
      (properties as { fontSize?: number }).fontSize = spec.fontSize;
    }
    if (spec.fontFamily !== undefined) {
      (properties as { fontFamily?: string }).fontFamily = spec.fontFamily;
    }
    if (spec.color !== undefined) {
      (properties as { solidFill?: RunProperties["solidFill"] }).solidFill = buildSolidFill(spec.color);
    }
    if (spec.outline !== undefined) {
      (properties as { textOutline?: RunProperties["textOutline"] }).textOutline = buildLine(
        spec.outline.color,
        spec.outline.width ?? 1,
      );
    }
    if (spec.effects !== undefined) {
      (properties as { effects?: RunProperties["effects"] }).effects = buildEffects(spec.effects);
    }
    if (spec.hyperlink !== undefined) {
      (properties as { hyperlink?: Hyperlink }).hyperlink = buildHyperlink(spec.hyperlink);
    }

    return properties;
  }

  return undefined;
}

/**
 * Build a text run from spec
 */
export function buildTextRun(spec: TextRunSpec): TextRun {
  const properties = buildRunProperties(spec);
  return {
    type: "text",
    text: spec.text,
    properties,
  };
}

/**
 * Build a paragraph from spec
 */
export function buildParagraph(spec: TextParagraphSpec): Paragraph {
  const runs = spec.runs.map(buildTextRun);

  const properties: ParagraphProperties = {};

  if (spec.level !== undefined) {
    (properties as { level?: number }).level = spec.level;
  }
  if (spec.alignment !== undefined) {
    (properties as { alignment?: string }).alignment = spec.alignment;
  }
  if (spec.bullet !== undefined && spec.bullet.type !== "none") {
    if (spec.bullet.type === "char") {
      (properties as { bulletStyle?: BulletStyle }).bulletStyle = {
        bullet: { type: "char", char: spec.bullet.char ?? "•" },
        colorFollowText: true,
        sizeFollowText: true,
        fontFollowText: true,
      };
    } else if (spec.bullet.type === "autoNum") {
      (properties as { bulletStyle?: BulletStyle }).bulletStyle = {
        bullet: { type: "auto", scheme: spec.bullet.autoNumType ?? "arabicPeriod" },
        colorFollowText: true,
        sizeFollowText: true,
        fontFollowText: true,
      };
    }
  }

  // Paragraph spacing
  if (spec.lineSpacing !== undefined) {
    if (spec.lineSpacing.type === "percent") {
      (properties as { lineSpacing?: LineSpacing }).lineSpacing = {
        type: "percent",
        value: spec.lineSpacing.value * 1000,
      };
    } else {
      (properties as { lineSpacing?: LineSpacing }).lineSpacing = {
        type: "points",
        value: spec.lineSpacing.value * 100,
      };
    }
  }
  if (spec.spaceBefore !== undefined) {
    (properties as { spaceBefore?: number }).spaceBefore = spec.spaceBefore * 100;
  }
  if (spec.spaceAfter !== undefined) {
    (properties as { spaceAfter?: number }).spaceAfter = spec.spaceAfter * 100;
  }
  if (spec.indent !== undefined) {
    (properties as { indent?: Pixels }).indent = spec.indent as Pixels;
  }
  if (spec.marginLeft !== undefined) {
    (properties as { marginLeft?: Pixels }).marginLeft = spec.marginLeft as Pixels;
  }

  return { properties, runs };
}

/**
 * Check if text spec is rich text (array of paragraphs)
 */
function isRichText(text: TextSpec): text is RichTextSpec {
  return Array.isArray(text);
}

/**
 * Build body properties from spec
 */
function buildBodyProperties(spec?: TextBodyPropertiesSpec): BodyProperties {
  if (!spec) {
    return {};
  }

  const props: BodyProperties = {};

  if (spec.anchor !== undefined) {
    (props as { anchor?: string }).anchor = spec.anchor;
  }
  if (spec.verticalType !== undefined) {
    (props as { verticalType?: string }).verticalType = spec.verticalType;
  }
  if (spec.wrapping !== undefined) {
    (props as { wrapping?: string }).wrapping = spec.wrapping;
  }
  if (spec.anchorCenter !== undefined) {
    (props as { anchorCenter?: boolean }).anchorCenter = spec.anchorCenter;
  }
  if (
    spec.insetLeft !== undefined ||
    spec.insetTop !== undefined ||
    spec.insetRight !== undefined ||
    spec.insetBottom !== undefined
  ) {
    (props as { insets?: BodyProperties["insets"] }).insets = {
      left: (spec.insetLeft ?? 0) as Pixels,
      top: (spec.insetTop ?? 0) as Pixels,
      right: (spec.insetRight ?? 0) as Pixels,
      bottom: (spec.insetBottom ?? 0) as Pixels,
    };
  }

  return props;
}

/**
 * Build a text body object from simple string or rich text spec
 */
export function buildTextBody(text: TextSpec, bodyPropertiesSpec?: TextBodyPropertiesSpec): TextBody {
  const bodyProperties = buildBodyProperties(bodyPropertiesSpec);

  if (isRichText(text)) {
    return {
      bodyProperties,
      paragraphs: text.map(buildParagraph),
    };
  }

  // Simple string - single paragraph with single run
  return {
    bodyProperties,
    paragraphs: [{ properties: {}, runs: [{ type: "text", text }] }],
  };
}

/**
 * Collect all hyperlink URLs from a TextSpec
 */
export function collectHyperlinks(text: TextSpec): HyperlinkInfo[] {
  const hyperlinks: HyperlinkInfo[] = [];

  if (!isRichText(text)) {
    return hyperlinks;
  }

  for (const paragraph of text) {
    for (const run of paragraph.runs) {
      if (run.hyperlink) {
        hyperlinks.push({
          url: run.hyperlink.url,
          tooltip: run.hyperlink.tooltip,
        });
      }
    }
  }

  return hyperlinks;
}

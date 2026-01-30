/**
 * @file Text building utilities for PPTX shapes
 */

import type { Fill, Line } from "@oxen-office/pptx/domain/color/types";
import type { TextBody, Paragraph, TextRun, RunProperties, BodyProperties } from "@oxen-office/pptx/domain/text";
import type { Effects } from "@oxen-office/pptx/domain/effects";
import type { Pixels } from "@oxen-office/ooxml/domain/units";
import type {
  TextSpec,
  TextRunSpec,
  TextParagraphSpec,
  RichTextSpec,
  TextBodyPropertiesSpec,
  HyperlinkSpec,
} from "./types";
import type { Hyperlink } from "@oxen-office/pptx/domain/resource";
import { buildSolidFill } from "./fill-builder";
import { buildLine } from "./line-builder";
import { buildEffects } from "./effects-builder";

/**
 * Hyperlink info collected during text building
 * URL will be replaced with rId after relationship registration
 */
export type HyperlinkInfo = {
  readonly url: string;
  readonly tooltip?: string;
};

/**
 * Map underline style to OOXML values
 * Based on ECMA-376 Part 1: §21.1.2.3.40 ST_TextUnderlineType
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
 * Superscript: +30%, Subscript: -25%
 */
const VERTICAL_POSITION_MAP: Record<string, number> = {
  normal: 0,
  superscript: 30,
  subscript: -25,
};

/**
 * Build hyperlink domain object from spec using placeholder ID
 * The URL is stored as the ID temporarily - will be replaced with real rId later
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
  // Build run properties if any formatting is specified
  if (spec.bold !== undefined || spec.italic !== undefined || spec.underline !== undefined ||
      spec.strikethrough !== undefined || spec.caps !== undefined || spec.verticalPosition !== undefined ||
      spec.letterSpacing !== undefined || spec.fontSize !== undefined || spec.fontFamily !== undefined ||
      spec.color !== undefined || spec.outline !== undefined || spec.effects !== undefined ||
      spec.hyperlink !== undefined) {
    const properties: RunProperties = {};

    if (spec.bold !== undefined) {(properties as { bold?: boolean }).bold = spec.bold;}
    if (spec.italic !== undefined) {(properties as { italic?: boolean }).italic = spec.italic;}
    if (spec.underline && spec.underline !== "none") {
      (properties as { underline?: string }).underline = UNDERLINE_MAP[spec.underline] ?? spec.underline;
    }
    if (spec.strikethrough && spec.strikethrough !== "none") {
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
    if (spec.fontSize !== undefined) {(properties as { fontSize?: number }).fontSize = spec.fontSize;}
    if (spec.fontFamily !== undefined) {(properties as { fontFamily?: string }).fontFamily = spec.fontFamily;}
    if (spec.color !== undefined) {
      (properties as { solidFill?: Fill }).solidFill = buildSolidFill(spec.color);
    }
    if (spec.outline !== undefined) {
      (properties as { textOutline?: Line }).textOutline = buildLine(spec.outline.color, spec.outline.width ?? 1);
    }
    if (spec.effects !== undefined) {
      (properties as { effects?: Effects }).effects = buildEffects(spec.effects);
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

  const properties: Paragraph["properties"] = {};

  if (spec.level !== undefined) {(properties as { level?: number }).level = spec.level;}
  if (spec.alignment !== undefined) {
    // Domain type uses full names, not OOXML short forms
    (properties as { alignment?: string }).alignment = spec.alignment;
  }
  if (spec.bullet !== undefined && spec.bullet.type !== "none") {
    if (spec.bullet.type === "char") {
      (properties as { bulletStyle?: object }).bulletStyle = {
        bullet: { type: "char", char: spec.bullet.char ?? "•" },
        colorFollowText: true,
        sizeFollowText: true,
        fontFollowText: true,
      };
    } else if (spec.bullet.type === "autoNum") {
      (properties as { bulletStyle?: object }).bulletStyle = {
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
      // Percent is stored as percentage * 1000 (e.g., 150% = 150000)
      (properties as { lineSpacing?: object }).lineSpacing = {
        type: "percent",
        value: spec.lineSpacing.value * 1000,
      };
    } else {
      // Points stored as points * 100 (centipoints)
      (properties as { lineSpacing?: object }).lineSpacing = {
        type: "points",
        value: spec.lineSpacing.value * 100,
      };
    }
  }
  if (spec.spaceBefore !== undefined) {
    // Points stored as points * 100 (centipoints)
    (properties as { spaceBefore?: number }).spaceBefore = spec.spaceBefore * 100;
  }
  if (spec.spaceAfter !== undefined) {
    // Points stored as points * 100 (centipoints)
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
  if (!spec) {return {};}

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
  if (spec.insetLeft !== undefined || spec.insetTop !== undefined ||
      spec.insetRight !== undefined || spec.insetBottom !== undefined) {
    (props as { insets?: object }).insets = {
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

/**
 * @file Theme editing for build command
 */

import { parseXml, serializeDocument } from "@oxen/xml";
import type { ZipPackage } from "@oxen/zip";
import { patchTheme } from "@oxen-office/pptx/patcher";
import { parseFontScheme } from "@oxen-office/pptx/parser/drawing-ml/theme";
import type { Color, SchemeColorName } from "@oxen-office/ooxml/domain/color";
import type { FontScheme } from "@oxen-office/ooxml/domain/font-scheme";
import type { ThemeEditSpec, ThemeFontSpec, ThemeSchemeColorName } from "./types";

const THEME_SCHEME_COLOR_NAMES: readonly ThemeSchemeColorName[] = [
  "dk1",
  "lt1",
  "dk2",
  "lt2",
  "accent1",
  "accent2",
  "accent3",
  "accent4",
  "accent5",
  "accent6",
  "hlink",
  "folHlink",
];

function isThemeSchemeColorName(value: string): value is ThemeSchemeColorName {
  return (THEME_SCHEME_COLOR_NAMES as readonly string[]).includes(value);
}

function requireThemePath(theme: ThemeEditSpec): string {
  if (!theme.path) {
    throw new Error('theme.path is required (e.g., "ppt/theme/theme1.xml")');
  }
  return theme.path;
}

function toSrgbColor(hex: string): Color {
  return { spec: { type: "srgb", value: hex } };
}

function mergeFontSpec(base: ThemeFontSpec, patch: ThemeFontSpec | undefined): ThemeFontSpec {
  if (!patch) {
    return base;
  }
  return {
    latin: patch.latin ?? base.latin,
    eastAsian: patch.eastAsian ?? base.eastAsian,
    complexScript: patch.complexScript ?? base.complexScript,
  };
}

function mergeFontScheme(base: FontScheme, patch: ThemeEditSpec["fontScheme"]): FontScheme {
  if (!patch) {
    return base;
  }
  return {
    majorFont: mergeFontSpec(base.majorFont, patch.majorFont),
    minorFont: mergeFontSpec(base.minorFont, patch.minorFont),
  };
}

export function applyThemeEditsToThemeXml(themeXmlText: string, theme: ThemeEditSpec): string {
  const hasColorScheme = theme.colorScheme && Object.keys(theme.colorScheme).length > 0;
  const hasFontScheme = theme.fontScheme && (theme.fontScheme.majorFont || theme.fontScheme.minorFont);
  if (!hasColorScheme && !hasFontScheme) {
    throw new Error("theme edits require at least one of colorScheme or fontScheme");
  }

  const themeXml = parseXml(themeXmlText);
  const changes: Parameters<typeof patchTheme>[1] = [];

  if (hasColorScheme && theme.colorScheme) {
    const scheme: Partial<Record<SchemeColorName, Color>> = {};
    for (const [name, value] of Object.entries(theme.colorScheme)) {
      if (!isThemeSchemeColorName(name)) {
        throw new Error(`theme.colorScheme has unsupported key: ${name}`);
      }
      if (!value) {
        continue;
      }
      scheme[name] = toSrgbColor(value);
    }
    changes.push({ type: "colorScheme", scheme });
  }

  if (hasFontScheme) {
    const base = parseFontScheme(themeXml);
    const merged = mergeFontScheme(base, theme.fontScheme);
    changes.push({ type: "fontScheme", scheme: merged });
  }

  const updated = patchTheme(themeXml, changes);
  return serializeDocument(updated, { declaration: true, standalone: true });
}

export function applyThemeEditsToPackage(zipPackage: ZipPackage, theme: ThemeEditSpec): void {
  const themePath = requireThemePath(theme);
  const themeXmlText = zipPackage.readText(themePath);
  if (!themeXmlText) {
    throw new Error(`Theme XML not found in template: ${themePath}`);
  }
  const updated = applyThemeEditsToThemeXml(themeXmlText, theme);
  zipPackage.writeText(themePath, updated);
}


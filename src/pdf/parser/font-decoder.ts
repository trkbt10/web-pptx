/**
 * @file PDF Font Decoder
 *
 * Handles ToUnicode CMap parsing for proper text decoding.
 * PDF fonts often use custom encodings that need to be decoded
 * through the ToUnicode CMap to get readable Unicode text.
 */

import {
  PDFPage,
  PDFDict,
  PDFName,
  PDFRef,
  PDFRawStream,
  PDFArray,
  decodePDFRawStream,
} from "pdf-lib";
import type { FontMapping, FontMetrics, FontInfo, FontMappings, CMapParseResult } from "../domain/font";
import { DEFAULT_FONT_METRICS, parseToUnicodeCMap } from "../domain/font";

// Re-export for backwards compatibility
export type { FontMapping, FontMetrics, FontInfo, FontMappings } from "../domain/font";
export { DEFAULT_FONT_METRICS, decodeText } from "../domain/font";

// =============================================================================
// Font Extraction
// =============================================================================

export type FontExtractionResult = {
  readonly toUnicode: CMapParseResult | null;
  readonly metrics: FontMetrics | null;
  readonly errors: readonly string[];
};

export type ExtractFontInfoDeps<PdfPageT, ResourcesT> = Readonly<{
  readonly getPageResources: (pdfPage: PdfPageT) => ResourcesT;
  readonly extractToUnicode: (resources: ResourcesT, fontName: string) => CMapParseResult;
  readonly extractFontMetrics: (resources: ResourcesT, fontName: string) => FontMetrics;
}>;

export function extractFontInfo(pdfPage: PDFPage, fontName: string): FontExtractionResult {
  return extractFontInfoWithDeps(pdfPage, fontName, DEFAULT_EXTRACT_FONT_INFO_DEPS);
}

export function extractFontInfoWithDeps<PdfPageT, ResourcesT>(
  pdfPage: PdfPageT,
  fontName: string,
  deps: ExtractFontInfoDeps<PdfPageT, ResourcesT>
): FontExtractionResult {
  const errors: string[] = [];
  let toUnicode: CMapParseResult | null = null;
  let metrics: FontMetrics | null = null;

  let resources: ResourcesT;
  try {
    resources = deps.getPageResources(pdfPage);
  } catch (error) {
    errors.push(`Failed to get page resources: ${formatError(error)}`);
    return { toUnicode, metrics, errors };
  }

  try {
    toUnicode = deps.extractToUnicode(resources, fontName);
  } catch (error) {
    errors.push(`Failed to extract ToUnicode for ${fontName}: ${formatError(error)}`);
  }

  try {
    metrics = deps.extractFontMetrics(resources, fontName);
  } catch (error) {
    errors.push(`Failed to extract metrics for ${fontName}: ${formatError(error)}`);
  }

  return { toUnicode, metrics, errors };
}

export function logExtractionErrors(result: FontExtractionResult, fontName: string): void {
  if (result.errors.length === 0) {
    return;
  }

  const successParts: string[] = [];
  if (result.toUnicode) {
    successParts.push("ToUnicode");
  }
  if (result.metrics) {
    successParts.push("metrics");
  }

  if (successParts.length > 0) {
    console.warn(
      `[PDF Font] Partial extraction for "${fontName}": ` +
      `succeeded: [${successParts.join(", ")}], ` +
      `failed: ${result.errors.length} operation(s)`
    );
    return;
  }

  console.warn(
    `[PDF Font] Complete extraction failure for "${fontName}": ` +
    result.errors.join("; ")
  );
}

/**
 * Extract ToUnicode mappings for all fonts on a page
 */
export function extractFontMappings(pdfPage: PDFPage): FontMappings {
  const mappings: FontMappings = new Map();

  let resources: PDFDict | null = null;
  try {
    resources = getPageResources(pdfPage);
  } catch (error) {
    console.warn(`[PDF Font] Failed to get page resources: ${formatError(error)}`);
    return mappings;
  }
  if (!resources) {
    return mappings;
  }

  let fonts: PDFDict | null = null;
  try {
    fonts = getFontDict(resources);
  } catch (error) {
    console.warn(`[PDF Font] Failed to get font dictionary: ${formatError(error)}`);
    return mappings;
  }
  if (!fonts) {
    return mappings;
  }

  const context = pdfPage.node.context;

  // Iterate through all fonts
  for (const [name, ref] of fonts.entries()) {
    const fontName = name instanceof PDFName ? name.asString() : String(name);
    const cleanName = fontName.startsWith("/") ? fontName.slice(1) : fontName;

    let fontDict: unknown;
    try {
      fontDict = ref instanceof PDFRef ? context.lookup(ref) : ref;
      if (!(fontDict instanceof PDFDict)) {
        continue;
      }
    } catch (error) {
      console.warn(`[PDF Font] Failed to lookup font dictionary for "${cleanName}": ${formatError(error)}`);
      continue;
    }
    if (!(fontDict instanceof PDFDict)) {
      continue;
    }

    const extractionResult = extractFontInfoFromFontDict(fontDict, context, cleanName);
    logExtractionErrors(extractionResult, cleanName);

    // Store font info even if mapping is empty (metrics may still be useful)
    mappings.set(cleanName, fontExtractionResultToFontInfo(extractionResult));
  }

  return mappings;
}

/**
 * Get Resources dictionary from page
 */
function getPageResources(pdfPage: PDFPage): PDFDict | null {
  const resourcesRef = pdfPage.node.Resources();
  if (!resourcesRef) return null;

  const resources = pdfPage.node.context.lookup(resourcesRef);
  return resources instanceof PDFDict ? resources : null;
}

/**
 * Get Font dictionary from resources
 */
function getFontDict(resources: PDFDict): PDFDict | null {
  const fontRef = resources.get(PDFName.of("Font"));
  if (!fontRef) return null;

  const context = resources.context;
  const fonts = fontRef instanceof PDFRef ? context.lookup(fontRef) : fontRef;
  return fonts instanceof PDFDict ? fonts : null;
}

/**
 * Extract complete font information including ToUnicode mapping and metrics, with error capture.
 */
function extractFontInfoFromFontDict(
  fontDict: PDFDict,
  context: PDFDict["context"],
  fontName: string
): FontExtractionResult {
  const errors: string[] = [];
  let toUnicode: CMapParseResult | null = null;
  let metrics: FontMetrics | null = null;

  try {
    toUnicode = extractToUnicodeMapping(fontDict, context);
  } catch (error) {
    errors.push(`Failed to extract ToUnicode for ${fontName}: ${formatError(error)}`);
  }

  try {
    metrics = extractFontMetrics(fontDict, context);
  } catch (error) {
    errors.push(`Failed to extract metrics for ${fontName}: ${formatError(error)}`);
  }

  return { toUnicode, metrics, errors };
}

function fontExtractionResultToFontInfo(result: FontExtractionResult): FontInfo {
  const toUnicode = result.toUnicode ?? { mapping: new Map<number, string>(), codeByteWidth: 1 as const };

  return {
    mapping: toUnicode.mapping,
    codeByteWidth: toUnicode.codeByteWidth,
    metrics: result.metrics ?? DEFAULT_FONT_METRICS,
  };
}

/**
 * Extract ToUnicode mapping from a font dictionary
 */
function extractToUnicodeMapping(
  fontDict: PDFDict,
  context: PDFDict["context"]
): CMapParseResult {
  const emptyResult: CMapParseResult = {
    mapping: new Map<number, string>(),
    codeByteWidth: 1,
  };

  // Check for ToUnicode stream
  const toUnicodeRef = fontDict.get(PDFName.of("ToUnicode"));
  if (!toUnicodeRef) {
    // Try looking in DescendantFonts for Type0 fonts
    const descendantsRef = fontDict.get(PDFName.of("DescendantFonts"));
    if (descendantsRef) {
      const descendants =
        descendantsRef instanceof PDFRef
          ? context.lookup(descendantsRef)
          : descendantsRef;

      if (descendants instanceof PDFArray && descendants.size() > 0) {
        const firstRef = descendants.get(0);
        const firstDescendant =
          firstRef instanceof PDFRef ? context.lookup(firstRef) : firstRef;

        if (firstDescendant instanceof PDFDict) {
          const descToUnicode = firstDescendant.get(PDFName.of("ToUnicode"));
          if (descToUnicode) {
            return extractToUnicodeMappingFromRef(descToUnicode, context);
          }
        }
      }
    }
    return emptyResult;
  }

  return extractToUnicodeMappingFromRef(toUnicodeRef, context);
}

/**
 * Extract font metrics from a font dictionary (PDF Reference 5.2)
 */
function extractFontMetrics(
  fontDict: PDFDict,
  context: PDFDict["context"]
): FontMetrics {
  // Check font type
  const subtype = fontDict.get(PDFName.of("Subtype"));
  const subtypeStr = subtype instanceof PDFName ? subtype.asString() : "";

  // For Type0 (composite) fonts, look in DescendantFonts
  if (subtypeStr === "/Type0") {
    return extractType0FontMetrics(fontDict, context);
  }

  // For simple fonts (Type1, TrueType, etc.)
  return extractSimpleFontMetrics(fontDict, context);
}

/**
 * Extract metrics from simple fonts (Type1, TrueType, etc.)
 * PDF Reference 5.5
 */
function extractSimpleFontMetrics(
  fontDict: PDFDict,
  context: PDFDict["context"]
): FontMetrics {
  const widths = new Map<number, number>();

  // Get FirstChar and LastChar
  const firstCharRef = fontDict.get(PDFName.of("FirstChar"));
  const lastCharRef = fontDict.get(PDFName.of("LastChar"));
  const widthsRef = fontDict.get(PDFName.of("Widths"));

  const firstChar = getNumber(firstCharRef) ?? 0;
  const lastChar = getNumber(lastCharRef) ?? 255;

  // Parse Widths array
  if (widthsRef) {
    const widthsArr = widthsRef instanceof PDFRef
      ? context.lookup(widthsRef)
      : widthsRef;

    if (widthsArr instanceof PDFArray) {
      for (let i = 0; i < widthsArr.size(); i++) {
        const width = getNumber(widthsArr.get(i));
        if (width !== null) {
          widths.set(firstChar + i, width);
        }
      }
    }
  }

  // Get ascender/descender from FontDescriptor
  const { ascender, descender } = extractFontDescriptorMetrics(fontDict, context);

  // Calculate default width (average of widths or 500)
  const defaultWidth = widths.size > 0
    ? Math.round([...widths.values()].reduce((a, b) => a + b, 0) / widths.size)
    : 500;

  return { widths, defaultWidth, ascender, descender };
}

/**
 * Extract metrics from Type0 (composite/CID) fonts
 * PDF Reference 5.6
 */
function extractType0FontMetrics(
  fontDict: PDFDict,
  context: PDFDict["context"]
): FontMetrics {
  const widths = new Map<number, number>();
  let defaultWidth = 1000; // CID font default

  // Get DescendantFonts
  const descendantsRef = fontDict.get(PDFName.of("DescendantFonts"));
  if (!descendantsRef) {
    return { widths, defaultWidth, ascender: 800, descender: -200 };
  }

  const descendants = descendantsRef instanceof PDFRef
    ? context.lookup(descendantsRef)
    : descendantsRef;

  if (!(descendants instanceof PDFArray) || descendants.size() === 0) {
    return { widths, defaultWidth, ascender: 800, descender: -200 };
  }

  const firstRef = descendants.get(0);
  const cidFont = firstRef instanceof PDFRef ? context.lookup(firstRef) : firstRef;

  if (!(cidFont instanceof PDFDict)) {
    return { widths, defaultWidth, ascender: 800, descender: -200 };
  }

  // Get DW (default width)
  const dwRef = cidFont.get(PDFName.of("DW"));
  if (dwRef) {
    const dw = getNumber(dwRef);
    if (dw !== null) {
      defaultWidth = dw;
    }
  }

  // Parse W array (width array for CID fonts)
  const wRef = cidFont.get(PDFName.of("W"));
  if (wRef) {
    const wArr = wRef instanceof PDFRef ? context.lookup(wRef) : wRef;
    if (wArr instanceof PDFArray) {
      parseCIDWidthArray(wArr, widths, context);
    }
  }

  // Get ascender/descender from CIDFont's FontDescriptor
  const { ascender, descender } = extractFontDescriptorMetrics(cidFont, context);

  return { widths, defaultWidth, ascender, descender };
}

/**
 * Parse CID font W (width) array
 * Format: [ c [w1 w2 ...] ] or [ c1 c2 w ]
 * PDF Reference 5.6.3
 */
function parseCIDWidthArray(
  wArr: PDFArray,
  widths: Map<number, number>,
  context: PDFDict["context"]
): void {
  let i = 0;

  while (i < wArr.size()) {
    const first = getNumber(wArr.get(i));
    if (first === null) {
      i++;
      continue;
    }

    const second = wArr.get(i + 1);

    if (second instanceof PDFArray) {
      // Format: c [w1 w2 w3 ...]
      // CID c has width w1, c+1 has w2, etc.
      for (let j = 0; j < second.size(); j++) {
        const w = getNumber(second.get(j));
        if (w !== null) {
          widths.set(first + j, w);
        }
      }
      i += 2;
    } else {
      // Format: c1 c2 w
      // All CIDs from c1 to c2 have width w
      const last = getNumber(second);
      const w = getNumber(wArr.get(i + 2));

      if (last !== null && w !== null) {
        for (let cid = first; cid <= last; cid++) {
          widths.set(cid, w);
        }
      }
      i += 3;
    }
  }
}

/**
 * Extract ascender/descender from FontDescriptor
 * PDF Reference 5.7
 */
function extractFontDescriptorMetrics(
  fontDict: PDFDict,
  context: PDFDict["context"]
): { ascender: number; descender: number } {
  const defaults = { ascender: 800, descender: -200 };

  const descriptorRef = fontDict.get(PDFName.of("FontDescriptor"));
  if (!descriptorRef) {
    return defaults;
  }

  const descriptor = descriptorRef instanceof PDFRef
    ? context.lookup(descriptorRef)
    : descriptorRef;

  if (!(descriptor instanceof PDFDict)) {
    return defaults;
  }

  const ascentRef = descriptor.get(PDFName.of("Ascent"));
  const descentRef = descriptor.get(PDFName.of("Descent"));

  const ascender = getNumber(ascentRef) ?? defaults.ascender;
  const descender = getNumber(descentRef) ?? defaults.descender;

  return { ascender, descender };
}

/**
 * Helper to extract number from PDFObject
 */
function getNumber(obj: unknown): number | null {
  if (typeof obj === "number") {
    return obj;
  }
  if (obj && typeof obj === "object" && "numberValue" in obj) {
    return (obj as { numberValue(): number }).numberValue();
  }
  return null;
}

/**
 * Extract mapping from ToUnicode reference
 */
function extractToUnicodeMappingFromRef(
  toUnicodeRef: unknown,
  context: PDFDict["context"]
): CMapParseResult {
  const emptyResult: CMapParseResult = { mapping: new Map(), codeByteWidth: 1 };

  const toUnicodeStream =
    toUnicodeRef instanceof PDFRef
      ? context.lookup(toUnicodeRef)
      : toUnicodeRef;

  if (!(toUnicodeStream instanceof PDFRawStream)) {
    return emptyResult;
  }

  // Decode the stream
  const decoded = decodePDFRawStream(toUnicodeStream);
  const cmapData = new TextDecoder("latin1").decode(decoded.decode());

  // Parse the CMap
  const result = parseToUnicodeCMap(cmapData);

  return result;
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

const DEFAULT_EXTRACT_FONT_INFO_DEPS: ExtractFontInfoDeps<PDFPage, PDFDict> = {
  getPageResources: (pdfPage) => {
    const resources = getPageResources(pdfPage);
    if (!resources) {
      throw new Error("Page resources not found");
    }
    return resources;
  },
  extractToUnicode: (resources, fontName) => {
    const fonts = getFontDict(resources);
    if (!fonts) {
      throw new Error("Font dictionary not found");
    }

    const fontDict = getFontDictEntryByName(fonts, fontName);
    if (!fontDict) {
      throw new Error(`Font "${fontName}" not found`);
    }

    return extractToUnicodeMapping(fontDict, resources.context);
  },
  extractFontMetrics: (resources, fontName) => {
    const fonts = getFontDict(resources);
    if (!fonts) {
      throw new Error("Font dictionary not found");
    }

    const fontDict = getFontDictEntryByName(fonts, fontName);
    if (!fontDict) {
      throw new Error(`Font "${fontName}" not found`);
    }

    return extractFontMetrics(fontDict, resources.context);
  },
};

function getFontDictEntryByName(fonts: PDFDict, fontName: string): PDFDict | null {
  const target = normalizeFontNameForResources(fontName);

  for (const [name, ref] of fonts.entries()) {
    const keyName = name instanceof PDFName ? name.asString() : String(name);
    const cleanKeyName = normalizeFontNameForResources(keyName);
    if (cleanKeyName !== target) {
      continue;
    }

    const fontDict = ref instanceof PDFRef ? fonts.context.lookup(ref) : ref;
    return fontDict instanceof PDFDict ? fontDict : null;
  }

  return null;
}

function normalizeFontNameForResources(fontName: string): string {
  return fontName.startsWith("/") ? fontName.slice(1) : fontName;
}

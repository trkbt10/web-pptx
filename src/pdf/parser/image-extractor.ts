/**
 * @file PDF image extractor
 *
 * Extracts embedded images from PDF XObject resources.
 * Handles image decoding and color space conversion.
 */

import {
  PDFDocument,
  PDFPage,
  PDFRawStream,
  PDFDict,
  PDFName,
  PDFRef,
  PDFArray,
  PDFNumber,
  decodePDFRawStream,
} from "pdf-lib";
import type { PdfImage, PdfColorSpace, PdfAlternateColorSpace, PdfGraphicsState } from "../domain";
import { createDefaultGraphicsState, getColorSpaceComponents } from "../domain";
import type { ParsedImage } from "./operator-parser";

// =============================================================================
// Image Extraction Types
// =============================================================================

/**
 * Raw image data extracted from PDF
 */
export type RawImageData = {
  readonly name: string;
  readonly data: Uint8Array;
  readonly width: number;
  readonly height: number;
  readonly colorSpace: PdfColorSpace;
  readonly bitsPerComponent: number;
  readonly hasAlpha: boolean;
};

/**
 * Image extraction options
 */
export type ImageExtractorOptions = {
  /** Extract embedded images. Default: true */
  readonly extractImages?: boolean;
  /** Maximum image dimension to extract. Default: 4096 */
  readonly maxDimension?: number;
  /** Page height for Y-flip calculations */
  readonly pageHeight: number;
};

// =============================================================================
// Image Extractor
// =============================================================================

/**
 * Extract images from a PDF page
 */
export async function extractImages(
  pdfPage: PDFPage,
  parsedImages: readonly ParsedImage[],
  options: ImageExtractorOptions
): Promise<PdfImage[]> {
  const { extractImages = true, maxDimension = 4096, pageHeight } = options;

  if (!extractImages) {
    return [];
  }

  const resources = getPageResources(pdfPage);
  if (!resources) {
    return [];
  }

  const xObjects = getXObjects(resources);
  if (!xObjects) {
    return [];
  }

  const images: PdfImage[] = [];

  for (const parsed of parsedImages) {
    const imageData = await extractImageData(
      parsed.name,
      xObjects,
      pdfPage.node.context,
      maxDimension
    );

    if (imageData) {
      images.push({
        type: "image",
        data: imageData.data,
        width: imageData.width,
        height: imageData.height,
        colorSpace: imageData.colorSpace,
        bitsPerComponent: imageData.bitsPerComponent,
        graphicsState: getImageGraphicsState(parsed.graphicsState, pageHeight),
      });
    }
  }

  return images;
}

/**
 * Get page resources dictionary
 */
function getPageResources(pdfPage: PDFPage): PDFDict | null {
  try {
    const node = pdfPage.node;
    const resourcesRef = node.Resources();
    if (!resourcesRef) return null;

    const resources = node.context.lookup(resourcesRef);
    if (resources instanceof PDFDict) {
      return resources;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get XObject dictionary from resources
 */
function getXObjects(resources: PDFDict): PDFDict | null {
  try {
    const xObjectRef = resources.get(PDFName.of("XObject"));
    if (!xObjectRef) return null;

    const context = resources.context;
    const xObjects = xObjectRef instanceof PDFRef
      ? context.lookup(xObjectRef)
      : xObjectRef;

    if (xObjects instanceof PDFDict) {
      return xObjects;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Extract image data from XObject
 */
async function extractImageData(
  name: string,
  xObjects: PDFDict,
  context: PDFDocument["context"],
  maxDimension: number
): Promise<RawImageData | null> {
  try {
    // Remove leading slash if present
    const cleanName = name.startsWith("/") ? name.slice(1) : name;
    const imageRef = xObjects.get(PDFName.of(cleanName));

    if (!imageRef) return null;

    const imageObj = imageRef instanceof PDFRef
      ? context.lookup(imageRef)
      : imageRef;

    if (!(imageObj instanceof PDFRawStream)) {
      return null;
    }

    const dict = imageObj.dict;

    // Check if it's an Image XObject
    const subtype = dict.get(PDFName.of("Subtype"));
    if (!(subtype instanceof PDFName) || subtype.toString() !== "/Image") {
      return null;
    }

    // Get dimensions
    const width = getNumberValue(dict, "Width") ?? 0;
    const height = getNumberValue(dict, "Height") ?? 0;

    if (width === 0 || height === 0) return null;
    if (width > maxDimension || height > maxDimension) return null;

    // Get color space
    const colorSpace = getColorSpace(dict, context);

    // Get bits per component
    const bitsPerComponent = getNumberValue(dict, "BitsPerComponent") ?? 8;

    // Get DecodeParms for Predictor handling
    const decodeParms = getDecodeParms(dict, context);

    // Decode image data
    const decoded = decodePDFRawStream(imageObj);
    const rawData = decoded.decode();

    // Apply PNG Predictor reversal if needed
    const components = getColorSpaceComponents(colorSpace);
    const data = reversePngPredictor(rawData, width, height, components, decodeParms);

    // Check for SMask (alpha channel)
    const hasAlpha = dict.has(PDFName.of("SMask"));

    return {
      name: cleanName,
      data,
      width,
      height,
      colorSpace,
      bitsPerComponent,
      hasAlpha,
    };
  } catch (error) {
    console.warn(`Failed to extract image "${name}":`, error);
    return null;
  }
}

/**
 * Get numeric value from dictionary
 */
function getNumberValue(dict: PDFDict, key: string): number | null {
  const value = dict.get(PDFName.of(key));
  if (value instanceof PDFNumber) {
    return value.asNumber();
  }
  return null;
}

/**
 * Get color space from image dictionary
 */
function getColorSpace(dict: PDFDict, context: PDFDocument["context"]): PdfColorSpace {
  const csRef = dict.get(PDFName.of("ColorSpace"));
  if (!csRef) return "DeviceRGB";

  // Direct name
  if (csRef instanceof PDFName) {
    return parseColorSpaceName(csRef.toString());
  }

  // Array (e.g., [/ICCBased ...])
  if (csRef instanceof PDFArray && csRef.size() > 0) {
    const first = csRef.get(0);
    if (first instanceof PDFName) {
      const name = first.toString();
      // For ICCBased, check the underlying color space
      if (name === "/ICCBased" && csRef.size() > 1) {
        const profileRef = csRef.get(1);
        const profile = profileRef instanceof PDFRef
          ? context.lookup(profileRef)
          : profileRef;
        if (profile instanceof PDFRawStream) {
          const n = getNumberValue(profile.dict, "N");
          if (n === 1) return "DeviceGray";
          if (n === 3) return "DeviceRGB";
          if (n === 4) return "DeviceCMYK";
        }
      }
      return parseColorSpaceName(name);
    }
  }

  return "DeviceRGB";
}

/**
 * Parse color space name string
 */
function parseColorSpaceName(name: string): PdfColorSpace {
  const cleanName = name.startsWith("/") ? name.slice(1) : name;
  switch (cleanName) {
    case "DeviceGray":
    case "CalGray":
      return "DeviceGray";
    case "DeviceRGB":
    case "CalRGB":
      return "DeviceRGB";
    case "DeviceCMYK":
      return "DeviceCMYK";
    default:
      return "DeviceRGB";
  }
}

/**
 * Get graphics state for image (no Y-flip, handled in transform-converter.ts)
 */
function getImageGraphicsState(graphicsState: PdfGraphicsState, _pageHeight: number): PdfGraphicsState {
  // Y-flip is handled in transform-converter.ts during PDF→PPTX conversion
  return graphicsState;
}

// =============================================================================
// Image Utilities
// =============================================================================

/**
 * Convert raw image data to PNG (basic implementation)
 * Note: Full PNG encoding requires a proper image library
 */
export function estimateImageSize(image: RawImageData): number {
  const bytesPerPixel = getColorSpaceComponents(image.colorSpace) * (image.bitsPerComponent / 8);
  return image.width * image.height * bytesPerPixel;
}

/**
 * Check if image dimensions are valid
 */
export function isValidImageDimensions(width: number, height: number): boolean {
  return (
    width > 0 &&
    height > 0 &&
    width <= 16384 &&
    height <= 16384 &&
    Number.isFinite(width) &&
    Number.isFinite(height)
  );
}

/**
 * Calculate image bounds from graphics state CTM
 */
export function getImageBounds(
  image: PdfImage
): { x: number; y: number; width: number; height: number } {
  const [a, , , d, e, f] = image.graphicsState.ctm;
  return {
    x: e,
    y: f,
    width: Math.abs(a),
    height: Math.abs(d),
  };
}

// =============================================================================
// PNG Predictor Handling
// =============================================================================

type DecodeParms = {
  readonly predictor: number;
  readonly columns: number;
  readonly colors: number;
};

/**
 * Get DecodeParms from image dictionary
 */
function getDecodeParms(dict: PDFDict, context: PDFDocument["context"]): DecodeParms | null {
  const parmsRef = dict.get(PDFName.of("DecodeParms"));
  if (!parmsRef) {
    return null;
  }

  const parms = parmsRef instanceof PDFRef ? context.lookup(parmsRef) : parmsRef;
  if (!(parms instanceof PDFDict)) {
    return null;
  }

  const predictor = getNumberValue(parms, "Predictor") ?? 1;
  if (predictor < 10 || predictor > 15) {
    // Not a PNG predictor
    return null;
  }

  return {
    predictor,
    columns: getNumberValue(parms, "Columns") ?? 1,
    colors: getNumberValue(parms, "Colors") ?? 1,
  };
}

/**
 * Reverse PNG Predictor filter
 *
 * PDF Reference 7.4.4.4: PNG predictors add a filter type byte at the start of each row.
 * - Filter 0: None
 * - Filter 1: Sub (add left pixel)
 * - Filter 2: Up (add pixel above)
 * - Filter 3: Average (add average of left and above)
 * - Filter 4: Paeth
 */
function reversePngPredictor(
  data: Uint8Array,
  width: number,
  height: number,
  components: number,
  decodeParms: DecodeParms | null
): Uint8Array {
  if (!decodeParms) {
    return data;
  }

  const bytesPerPixel = components;
  const rowBytesWithFilter = width * bytesPerPixel + 1; // +1 for filter type byte
  const rowBytesOutput = width * bytesPerPixel;

  // Check if data has expected length with filter bytes
  const expectedLength = height * rowBytesWithFilter;
  if (data.length !== expectedLength) {
    // Data doesn't match expected PNG predictor format, return as-is
    return data;
  }

  const output = new Uint8Array(height * rowBytesOutput);

  for (let y = 0; y < height; y++) {
    const filterType = data[y * rowBytesWithFilter];
    const srcRowStart = y * rowBytesWithFilter + 1; // Skip filter byte
    const dstRowStart = y * rowBytesOutput;

    switch (filterType) {
      case 0: // None
        for (let x = 0; x < rowBytesOutput; x++) {
          output[dstRowStart + x] = data[srcRowStart + x] ?? 0;
        }
        break;

      case 1: // Sub
        for (let x = 0; x < rowBytesOutput; x++) {
          const raw = data[srcRowStart + x] ?? 0;
          const left = x >= bytesPerPixel ? (output[dstRowStart + x - bytesPerPixel] ?? 0) : 0;
          output[dstRowStart + x] = (raw + left) & 0xff;
        }
        break;

      case 2: // Up
        for (let x = 0; x < rowBytesOutput; x++) {
          const raw = data[srcRowStart + x] ?? 0;
          const above = y > 0 ? (output[dstRowStart - rowBytesOutput + x] ?? 0) : 0;
          output[dstRowStart + x] = (raw + above) & 0xff;
        }
        break;

      case 3: // Average
        for (let x = 0; x < rowBytesOutput; x++) {
          const raw = data[srcRowStart + x] ?? 0;
          const left = x >= bytesPerPixel ? (output[dstRowStart + x - bytesPerPixel] ?? 0) : 0;
          const above = y > 0 ? (output[dstRowStart - rowBytesOutput + x] ?? 0) : 0;
          output[dstRowStart + x] = (raw + Math.floor((left + above) / 2)) & 0xff;
        }
        break;

      case 4: // Paeth
        for (let x = 0; x < rowBytesOutput; x++) {
          const raw = data[srcRowStart + x] ?? 0;
          const left = x >= bytesPerPixel ? (output[dstRowStart + x - bytesPerPixel] ?? 0) : 0;
          const above = y > 0 ? (output[dstRowStart - rowBytesOutput + x] ?? 0) : 0;
          const upperLeft =
            y > 0 && x >= bytesPerPixel
              ? (output[dstRowStart - rowBytesOutput + x - bytesPerPixel] ?? 0)
              : 0;
          output[dstRowStart + x] = (raw + paethPredictor(left, above, upperLeft)) & 0xff;
        }
        break;

      default:
        // Unknown filter, copy as-is
        for (let x = 0; x < rowBytesOutput; x++) {
          output[dstRowStart + x] = data[srcRowStart + x] ?? 0;
        }
    }
  }

  return output;
}

/**
 * Paeth predictor function
 */
function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);

  if (pa <= pb && pa <= pc) {
    return a;
  }
  if (pb <= pc) {
    return b;
  }
  return c;
}

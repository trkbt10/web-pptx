/**
 * @file High-level fig file parsing API
 */

import type { FigNode, KiwiSchema } from "../types";
import { parseFigHeader, getPayload, isFigFile } from "./header";
import {
  decodeFigSchema,
  decodeFigMessage,
  splitFigChunks,
} from "../kiwi/decoder";
import { decompressDeflateRaw, decompressZstd, detectCompression } from "./decompress";
import { loadZipPackage } from "@oxen/zip";

// =============================================================================
// Parsed Fig File Result
// =============================================================================

/**
 * Result of parsing a .fig file
 */
export type ParsedFigFile = {
  /** Decoded schema */
  readonly schema: KiwiSchema;
  /** Node changes from the message */
  readonly nodeChanges: readonly FigNode[];
  /** Raw message data */
  readonly message: Record<string, unknown>;
};

// =============================================================================
// ZIP Detection
// =============================================================================

/** ZIP magic bytes (PK) */
const ZIP_MAGIC = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);

/**
 * Check if data is a ZIP file
 */
function isZipFile(data: Uint8Array): boolean {
  if (data.length < 4) {
    return false;
  }
  return (
    data[0] === ZIP_MAGIC[0] &&
    data[1] === ZIP_MAGIC[1] &&
    data[2] === ZIP_MAGIC[2] &&
    data[3] === ZIP_MAGIC[3]
  );
}

/**
 * Extract canvas.fig from a Figma ZIP file
 */
async function extractCanvasFromZip(data: Uint8Array): Promise<Uint8Array> {
  const zipPackage = await loadZipPackage(data);

  // Try common canvas file names
  const canvasNames = ["canvas.fig", "thumbnail.fig"];

  for (const name of canvasNames) {
    const content = zipPackage.readBinary(name);
    if (content) {
      return new Uint8Array(content);
    }
  }

  // List available files for debugging
  const files = zipPackage.listFiles();

  throw new Error(
    `Could not find canvas.fig in ZIP. Available files: ${files.join(", ")}`
  );
}

// =============================================================================
// Decompression
// =============================================================================

/**
 * Decompress a fig file chunk.
 * Fig files typically use raw deflate, but may use zstd.
 */
function decompressFigChunk(data: Uint8Array): Uint8Array {
  // Check for zstd first (has magic header)
  const compressionType = detectCompression(data);
  if (compressionType === "zstd") {
    return decompressZstd(data);
  }

  // Otherwise try raw deflate (no header to detect)
  // This is what fig-kiwi files typically use
  return decompressDeflateRaw(data);
}

// =============================================================================
// Fig File Parsing
// =============================================================================

/**
 * Parse raw fig-kiwi data (not ZIP wrapped)
 */
function parseRawFigData(data: Uint8Array): ParsedFigFile {
  // Validate file
  if (!isFigFile(data)) {
    throw new Error("Invalid fig-kiwi data: missing magic header");
  }

  // Parse header
  const header = parseFigHeader(data);
  const payload = getPayload(data);

  // Split into schema and data chunks
  const chunks = splitFigChunks(payload, header.payloadSize);

  // Decompress chunks
  // Fig files typically use raw deflate (no header), but may use zstd
  const schemaData = decompressFigChunk(chunks.schema);
  const messageData = decompressFigChunk(chunks.data);

  // Decode schema
  const schema = decodeFigSchema(schemaData);

  // Decode message
  const message = decodeFigMessage(schema, messageData, "Message");

  // Extract node changes
  const nodeChanges = (message.nodeChanges ?? []) as readonly FigNode[];

  return {
    schema,
    nodeChanges,
    message,
  };
}

/**
 * Parse a .fig file and extract node changes
 *
 * Supports both:
 * - Raw fig-kiwi format (starts with "fig-kiwi")
 * - ZIP-wrapped format (Figma's actual .fig export format)
 *
 * @param data - Raw .fig file bytes
 * @returns Parsed schema and nodes
 */
export async function parseFigFile(data: Uint8Array): Promise<ParsedFigFile> {
  // Check if it's a ZIP file (Figma's actual format)
  if (isZipFile(data)) {
    const canvasData = await extractCanvasFromZip(data);
    return parseRawFigData(canvasData);
  }

  // Otherwise try raw fig-kiwi format
  return parseRawFigData(data);
}

/**
 * Parse a .fig file synchronously (only works with raw fig-kiwi format)
 *
 * @param data - Raw fig-kiwi format bytes
 * @returns Parsed schema and nodes
 */
export function parseFigFileSync(data: Uint8Array): ParsedFigFile {
  if (isZipFile(data)) {
    throw new Error(
      "ZIP-wrapped .fig files require async parsing. Use parseFigFile() instead."
    );
  }
  return parseRawFigData(data);
}

/**
 * Check if data is a valid .fig file (raw fig-kiwi format)
 */
export function isValidFigFile(data: Uint8Array): boolean {
  return isFigFile(data);
}

/**
 * Check if data is a Figma ZIP file
 */
export function isFigmaZipFile(data: Uint8Array): boolean {
  return isZipFile(data);
}

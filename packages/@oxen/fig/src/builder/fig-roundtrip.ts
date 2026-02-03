/**
 * @file Roundtrip-capable .fig file editor
 *
 * Loads an existing .fig file, allows modification, and saves back
 * using the original schema for compatibility.
 */

import { deflateRaw } from "pako";
import type { KiwiSchema, FigNode } from "../types";
import { ByteBuffer } from "../kiwi/byte-buffer";
import { StreamingFigEncoder } from "../kiwi/stream";
import { parseFigHeader, getPayload } from "../parser/header";
import { splitFigChunks, decodeFigSchema, decodeFigMessage } from "../kiwi/decoder";
import { decompressDeflateRaw, detectCompression, decompressZstd } from "../parser/decompress";
import { loadZipPackage, createEmptyZipPackage } from "@oxen/zip";
import { buildFigHeader } from "./header";

// =============================================================================
// Types
// =============================================================================

/** ZIP magic bytes (PK) */
const ZIP_MAGIC = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);

/** Metadata from the .fig file */
export type FigMetadata = {
  readonly clientMeta?: {
    readonly backgroundColor?: { r: number; g: number; b: number; a: number };
    readonly thumbnailSize?: { width: number; height: number };
    readonly renderCoordinates?: { x: number; y: number; width: number; height: number };
  };
  readonly fileName?: string;
  readonly developerRelatedLinks?: readonly string[];
  readonly exportedAt?: string;
};

/** Image data */
export type FigImage = {
  readonly ref: string;
  readonly data: Uint8Array;
  readonly mimeType: string;
};

/** Blob data */
export type FigBlob = Record<string, unknown>;

/** Loaded .fig file data */
export type LoadedFigFile = {
  /** Original schema (for roundtrip) */
  readonly schema: KiwiSchema;
  /** Compressed schema bytes (for exact roundtrip) */
  readonly compressedSchema: Uint8Array;
  /** Header version character */
  readonly version: string;
  /** Node changes */
  readonly nodeChanges: FigNode[];
  /** Blobs */
  readonly blobs: readonly FigBlob[];
  /** Images from ZIP */
  readonly images: ReadonlyMap<string, FigImage>;
  /** Metadata from meta.json */
  readonly metadata: FigMetadata | null;
  /** Thumbnail data */
  readonly thumbnail: Uint8Array | null;
  /** Message header fields (type, sessionID, etc.) */
  readonly messageHeader: Record<string, unknown>;
};

// =============================================================================
// Helper Functions
// =============================================================================

function isZipFile(data: Uint8Array): boolean {
  if (data.length < 4) return false;
  return (
    data[0] === ZIP_MAGIC[0] &&
    data[1] === ZIP_MAGIC[1] &&
    data[2] === ZIP_MAGIC[2] &&
    data[3] === ZIP_MAGIC[3]
  );
}

function decompressFigChunk(data: Uint8Array): Uint8Array {
  const compressionType = detectCompression(data);
  if (compressionType === "zstd") {
    return decompressZstd(data);
  }
  return decompressDeflateRaw(data);
}

function getMimeTypeFromContent(data: Uint8Array): string {
  if (data.length >= 8 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) {
    return "image/png";
  }
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return "image/jpeg";
  }
  return "application/octet-stream";
}

// =============================================================================
// Load Function
// =============================================================================

/**
 * Load a .fig file for roundtrip editing.
 * Preserves the original schema and metadata for compatibility.
 */
export async function loadFigFile(data: Uint8Array): Promise<LoadedFigFile> {
  let canvasData: Uint8Array;
  const images = new Map<string, FigImage>();
  let metadata: FigMetadata | null = null;
  let thumbnail: Uint8Array | null = null;

  // Handle ZIP wrapper
  if (isZipFile(data)) {
    const zipPackage = await loadZipPackage(data);
    const files = zipPackage.listFiles();

    // Find canvas.fig
    const canvasContent = zipPackage.readBinary("canvas.fig");
    if (!canvasContent) {
      throw new Error(`Could not find canvas.fig in ZIP. Available: ${files.join(", ")}`);
    }
    canvasData = new Uint8Array(canvasContent);

    // Extract metadata
    const metaContent = zipPackage.readText("meta.json");
    if (metaContent) {
      try {
        const raw = JSON.parse(metaContent);
        metadata = {
          clientMeta: raw.client_meta ? {
            backgroundColor: raw.client_meta.background_color,
            thumbnailSize: raw.client_meta.thumbnail_size,
            renderCoordinates: raw.client_meta.render_coordinates,
          } : undefined,
          fileName: raw.file_name,
          developerRelatedLinks: raw.developer_related_links,
          exportedAt: raw.exported_at,
        };
      } catch {
        // Ignore parse errors
      }
    }

    // Extract thumbnail
    const thumbnailContent = zipPackage.readBinary("thumbnail.png");
    if (thumbnailContent) {
      thumbnail = new Uint8Array(thumbnailContent);
    }

    // Extract images
    for (const file of files) {
      if (file.startsWith("images/") && file.length > 7) {
        const imageData = zipPackage.readBinary(file);
        if (imageData) {
          const ref = file.substring(7);
          const imgBytes = new Uint8Array(imageData);
          images.set(ref, {
            ref,
            data: imgBytes,
            mimeType: getMimeTypeFromContent(imgBytes),
          });
        }
      }
    }
  } else {
    canvasData = data;
  }

  // Parse header
  const header = parseFigHeader(canvasData);
  const payload = getPayload(canvasData);

  // Split chunks and keep compressed schema for exact roundtrip
  const chunks = splitFigChunks(payload, header.payloadSize);
  const compressedSchema = chunks.schema;

  // Decompress and decode
  const schemaData = decompressFigChunk(compressedSchema);
  const messageData = decompressFigChunk(chunks.data);
  const schema = decodeFigSchema(schemaData);
  const message = decodeFigMessage(schema, messageData, "Message");

  // Extract node changes (mutable copy)
  const nodeChanges = [...((message.nodeChanges ?? []) as FigNode[])];

  // Extract blobs
  const blobs = (message.blobs ?? []) as readonly FigBlob[];

  // Extract message header (non-node fields, non-blob fields)
  const messageHeader: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(message)) {
    if (key !== "nodeChanges") {
      messageHeader[key] = value;
    }
  }

  return {
    schema,
    compressedSchema,
    version: header.version,
    nodeChanges,
    blobs,
    images,
    metadata,
    thumbnail,
    messageHeader,
  };
}

// =============================================================================
// Save Function
// =============================================================================

/** Options for saving */
export type SaveFigOptions = {
  /** Update metadata (merged with existing) */
  readonly metadata?: Partial<FigMetadata>;
  /** New thumbnail data */
  readonly thumbnail?: Uint8Array;
  /** Additional images to include */
  readonly images?: ReadonlyMap<string, FigImage>;
};

/**
 * Save a loaded .fig file back to bytes.
 * Uses the original schema for compatibility.
 */
export async function saveFigFile(
  loaded: LoadedFigFile,
  options?: SaveFigOptions
): Promise<Uint8Array> {
  // Re-encode message using streaming encoder with original schema
  const encoder = new StreamingFigEncoder({ schema: loaded.schema });

  // Write header fields including blobs
  const headerFields: Record<string, unknown> = {
    type: loaded.messageHeader.type as { value: number } | undefined,
    sessionID: (loaded.messageHeader.sessionID as number) ?? 1,
    ackID: (loaded.messageHeader.ackID as number) ?? 0,
  };

  // Include blobs if present (required for geometry rendering)
  if (loaded.blobs.length > 0) {
    headerFields.blobs = loaded.blobs;
  }

  encoder.writeHeader(headerFields);

  // Write node changes
  for (const node of loaded.nodeChanges) {
    encoder.writeNodeChange(node as Record<string, unknown>);
  }

  const messageData = encoder.finalize();
  const compressedMessage = deflateRaw(messageData);

  // Build data chunk with 4-byte LE size prefix
  const dataChunk = new Uint8Array(4 + compressedMessage.length);
  const dataView = new DataView(dataChunk.buffer);
  dataView.setUint32(0, compressedMessage.length, true);
  dataChunk.set(compressedMessage, 4);

  // Build canvas.fig using ORIGINAL compressed schema for exact compatibility
  const header = buildFigHeader(loaded.compressedSchema.length, loaded.version);
  const totalSize = header.length + loaded.compressedSchema.length + dataChunk.length;
  const canvasData = new Uint8Array(totalSize);
  canvasData.set(header, 0);
  canvasData.set(loaded.compressedSchema, header.length);
  canvasData.set(dataChunk, header.length + loaded.compressedSchema.length);

  // Create ZIP package
  const zip = createEmptyZipPackage();
  zip.writeBinary("canvas.fig", canvasData);

  // Add metadata
  const mergedMetadata = {
    ...loaded.metadata,
    ...options?.metadata,
  };
  if (mergedMetadata.fileName || mergedMetadata.exportedAt) {
    const metaJson = {
      client_meta: mergedMetadata.clientMeta ? {
        background_color: mergedMetadata.clientMeta.backgroundColor,
        thumbnail_size: mergedMetadata.clientMeta.thumbnailSize,
        render_coordinates: mergedMetadata.clientMeta.renderCoordinates,
      } : undefined,
      file_name: mergedMetadata.fileName,
      developer_related_links: mergedMetadata.developerRelatedLinks ?? [],
      exported_at: mergedMetadata.exportedAt ?? new Date().toISOString(),
    };
    zip.writeText("meta.json", JSON.stringify(metaJson));
  }

  // Add thumbnail
  const thumbnailData = options?.thumbnail ?? loaded.thumbnail;
  if (thumbnailData) {
    zip.writeBinary("thumbnail.png", thumbnailData);
  }

  // Add images
  const allImages = new Map(loaded.images);
  if (options?.images) {
    for (const [ref, img] of options.images) {
      allImages.set(ref, img);
    }
  }
  for (const [ref, img] of allImages) {
    zip.writeBinary(`images/${ref}`, img.data);
  }

  // Generate ZIP
  const buffer = await zip.toArrayBuffer({ compressionLevel: 6 });
  return new Uint8Array(buffer);
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Clone a loaded .fig file (deep copy of mutable parts).
 */
export function cloneFigFile(loaded: LoadedFigFile): LoadedFigFile {
  return {
    ...loaded,
    nodeChanges: loaded.nodeChanges.map(n => ({ ...n })),
  };
}

/**
 * Add a node change to a loaded file.
 */
export function addNodeChange(
  loaded: LoadedFigFile,
  node: FigNode
): void {
  loaded.nodeChanges.push(node);
}

/**
 * Find a node by name.
 */
export function findNodeByName(
  loaded: LoadedFigFile,
  name: string
): FigNode | undefined {
  return loaded.nodeChanges.find(n => n.name === name);
}

/**
 * Find nodes by type.
 */
export function findNodesByType(
  loaded: LoadedFigFile,
  typeName: string
): FigNode[] {
  return loaded.nodeChanges.filter(n => {
    const nodeData = n as Record<string, unknown>;
    const type = nodeData.type as { name?: string } | undefined;
    return type?.name === typeName;
  });
}

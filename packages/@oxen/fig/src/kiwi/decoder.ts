/**
 * @file Kiwi schema and message decoder
 */

import type { KiwiSchema, KiwiDefinition, KiwiField } from "../types";
import { ByteBuffer } from "./byte-buffer";
import { resolveTypeName, resolveKindName } from "./schema";
import { FigParseError } from "../errors";

// Import from core
import { decodePrimitive } from "./core/primitive-codec";
import { decodeDefinition } from "./core/definition-codec";
import { getPrimitiveTypeName, isPrimitiveTypeId } from "./core/primitives";
import type { KiwiFormat, ValueDecoder } from "./core/types";

/**
 * Decode a Kiwi schema from binary data (length-prefixed strings).
 *
 * @param data - Binary schema data
 * @returns Decoded schema
 */
export function decodeSchema(data: Uint8Array): KiwiSchema {
  const buffer = new ByteBuffer(data);
  const definitionCount = buffer.readVarUint();
  const definitions: KiwiDefinition[] = [];

  for (const _ of Array(definitionCount).keys()) {
    const name = buffer.readString();
    const kind = resolveKindName(buffer.readByte());
    const fieldCount = buffer.readVarUint();
    const fields: KiwiField[] = [];

    for (const __ of Array(fieldCount).keys()) {
      const fieldName = buffer.readString();
      const typeId = buffer.readVarInt();
      const isArray = buffer.readByte() !== 0;
      const value = buffer.readVarUint();

      fields.push({
        name: fieldName,
        type: resolveTypeName(typeId, definitions),
        typeId,
        isArray,
        value,
      });
    }

    definitions.push({ name, kind, fields });
  }

  return { definitions };
}

/**
 * Decode a fig-kiwi schema from binary data (null-terminated strings).
 * This is the format used by .fig files.
 *
 * @param data - Binary schema data
 * @returns Decoded schema
 */
export function decodeFigSchema(data: Uint8Array): KiwiSchema {
  const buffer = new ByteBuffer(data);
  const definitionCount = buffer.readVarUint();
  const definitions: KiwiDefinition[] = [];

  for (const _ of Array(definitionCount).keys()) {
    const name = buffer.readNullString();
    const kind = resolveKindName(buffer.readByte());
    const fieldCount = buffer.readVarUint();
    const fields: KiwiField[] = [];

    for (const __ of Array(fieldCount).keys()) {
      const fieldName = buffer.readNullString();
      const typeId = buffer.readVarInt();
      const isArray = buffer.readByte() !== 0;
      const value = buffer.readVarUint();

      fields.push({
        name: fieldName,
        type: resolveTypeName(typeId, definitions),
        typeId,
        isArray,
        value,
      });
    }

    definitions.push({ name, kind, fields });
  }

  return { definitions };
}

/**
 * Decode raw fig file chunks.
 * Fig files have: schema chunk (deflate) + data chunk (deflate)
 */
export type FigChunks = {
  schema: Uint8Array;
  data: Uint8Array;
};

/**
 * Split standard Kiwi payload into chunks.
 * Each chunk is prefixed with its size as VarUint.
 *
 * @param payload - Raw payload
 * @returns Schema and data chunks
 */
export function splitChunks(payload: Uint8Array): FigChunks {
  const buffer = new ByteBuffer(payload);

  // First chunk: schema
  const schemaSize = buffer.readVarUint();
  const schema = buffer.readBytes(schemaSize);

  // Second chunk: data
  const dataSize = buffer.readVarUint();
  const data = buffer.readBytes(dataSize);

  return { schema, data };
}

/**
 * Split fig file payload into schema and data chunks.
 * Schema chunk size is in header (payloadSize field).
 * Data chunk has 4-byte LE size prefix.
 *
 * @param payload - Raw payload (after header)
 * @param schemaSize - Size of schema chunk from header
 * @returns Schema and data chunks
 */
export function splitFigChunks(
  payload: Uint8Array,
  schemaSize: number
): FigChunks {
  const schema = payload.slice(0, schemaSize);

  // Data chunk starts after schema
  const dataStart = schemaSize;
  const dataChunk = payload.slice(dataStart);

  // Data chunk has 4-byte LE size prefix
  const view = new DataView(dataChunk.buffer, dataChunk.byteOffset, 4);
  const dataSize = view.getUint32(0, true);
  const data = dataChunk.slice(4, 4 + dataSize);

  return { schema, data };
}

/** Value decoder that dispatches by typeId */
function createValueDecoder(format: KiwiFormat): ValueDecoder {
  const decodeValueByTypeId: ValueDecoder = (options) => {
    const { buffer, schema, typeId } = options;
    if (isPrimitiveTypeId(typeId)) {
      const typeName = getPrimitiveTypeName(typeId)!;
      return decodePrimitive({ buffer, type: typeName, format });
    }

    const definition = schema.definitions[typeId];
    if (!definition) {
      throw new FigParseError(`Unknown type index: ${typeId}`);
    }

    return decodeDefinition({
      buffer,
      schema,
      definition,
      format,
      decodeValue: decodeValueByTypeId,
    });
  };
  return decodeValueByTypeId;
}

/** Options for internal message decoding */
type DecodeMessageInternalOptions = {
  readonly schema: KiwiSchema;
  readonly buffer: ByteBuffer;
  readonly typeName: string;
  readonly format: KiwiFormat;
};

/** Internal decode with format parameter */
function decodeMessageInternal(
  options: DecodeMessageInternalOptions
): Record<string, unknown> {
  const { schema, buffer, typeName, format } = options;
  const definition = schema.definitions.find((d) => d.name === typeName);
  if (!definition) {
    throw new FigParseError(`Unknown type: ${typeName}`);
  }

  const decodeValue = createValueDecoder(format);
  return decodeDefinition({
    buffer,
    schema,
    definition,
    format,
    decodeValue,
  }) as Record<string, unknown>;
}

/**
 * Decode a Kiwi message using a schema.
 *
 * @param schema - Schema to use for decoding
 * @param data - Binary message data
 * @param typeName - Name of the message type to decode
 * @returns Decoded message object
 */
export function decodeMessage(
  schema: KiwiSchema,
  data: Uint8Array,
  typeName: string
): Record<string, unknown> {
  const buffer = new ByteBuffer(data);
  return decodeMessageInternal({ schema, buffer, typeName, format: "standard" });
}

/**
 * Decode a fig-kiwi message using a schema.
 * Uses null-terminated strings for fig format.
 *
 * @param schema - Schema to use for decoding
 * @param data - Binary message data
 * @param typeName - Name of the message type to decode
 * @returns Decoded message object
 */
export function decodeFigMessage(
  schema: KiwiSchema,
  data: Uint8Array,
  typeName: string
): Record<string, unknown> {
  const buffer = new ByteBuffer(data);
  return decodeMessageInternal({ schema, buffer, typeName, format: "fig" });
}

/**
 * @file Kiwi schema and message encoder
 */

import type { KiwiSchema, KiwiDefinition } from "../types";
import { ByteBuffer } from "./byte-buffer";
import { KIWI_KIND } from "./schema";
import { FigBuildError } from "../errors";

// Import from core
import { encodePrimitive } from "./core/primitive-codec";
import { encodeDefinition } from "./core/definition-codec";
import { TYPE_IDS, getPrimitiveTypeName, isPrimitiveTypeId } from "./core/primitives";
import type { KiwiFormat, ValueEncoder } from "./core/types";

/** Map from kind name to kind constant */
const KIND_IDS: Record<string, number> = {
  ENUM: KIWI_KIND.ENUM,
  STRUCT: KIWI_KIND.STRUCT,
  MESSAGE: KIWI_KIND.MESSAGE,
};

/**
 * Resolve type name to type ID.
 */
function resolveTypeId(
  typeName: string,
  definitions: readonly KiwiDefinition[]
): number {
  const primitiveId = TYPE_IDS[typeName];
  if (primitiveId !== undefined) {
    return primitiveId;
  }

  // Custom type - find index in definitions
  const index = definitions.findIndex((d) => d.name === typeName);
  if (index >= 0) {
    return index;
  }

  throw new FigBuildError(`Unknown type: ${typeName}`);
}

/**
 * Encode a Kiwi schema to binary data.
 *
 * @param schema - Schema to encode
 * @returns Binary schema data
 */
export function encodeSchema(schema: KiwiSchema): Uint8Array {
  const buffer = new ByteBuffer();

  buffer.writeVarUint(schema.definitions.length);

  for (const def of schema.definitions) {
    buffer.writeString(def.name);
    buffer.writeByte(KIND_IDS[def.kind] ?? KIWI_KIND.MESSAGE);
    buffer.writeVarUint(def.fields.length);

    for (const field of def.fields) {
      buffer.writeString(field.name);
      // Use typeId directly if available, otherwise resolve from type name
      const typeId =
        field.typeId ?? resolveTypeId(field.type, schema.definitions);
      buffer.writeVarInt(typeId);
      buffer.writeByte(field.isArray ? 1 : 0);
      buffer.writeVarUint(field.value);
    }
  }

  return buffer.toUint8Array();
}

/** Create value encoder for given format */
function createValueEncoder(format: KiwiFormat): ValueEncoder {
  const encodeValueByTypeId: ValueEncoder = (options) => {
    const { buffer, schema, typeId, value, strict } = options;
    if (isPrimitiveTypeId(typeId)) {
      const typeName = getPrimitiveTypeName(typeId)!;
      encodePrimitive({ buffer, type: typeName, value, format });
      return;
    }

    const definition = schema.definitions[typeId];
    if (!definition) {
      throw new FigBuildError(`Unknown type index: ${typeId}`);
    }

    encodeDefinition({
      buffer,
      schema,
      definition,
      message: value as Record<string, unknown>,
      format,
      encodeValue: encodeValueByTypeId,
      strict,
    });
  };
  return encodeValueByTypeId;
}

/** Options for internal message encoding */
type EncodeMessageInternalOptions = {
  readonly schema: KiwiSchema;
  readonly buffer: ByteBuffer;
  readonly message: Record<string, unknown>;
  readonly typeName: string;
  readonly format: KiwiFormat;
};

/** Internal encode with format parameter */
function encodeMessageInternal(options: EncodeMessageInternalOptions): void {
  const { schema, buffer, message, typeName, format } = options;
  const definition = schema.definitions.find((d) => d.name === typeName);
  if (!definition) {
    throw new FigBuildError(`Unknown type: ${typeName}`);
  }

  const encodeValue = createValueEncoder(format);
  encodeDefinition({
    buffer,
    schema,
    definition,
    message,
    format,
    encodeValue,
    strict: false,
  });
}

/**
 * Encode a message to binary data.
 *
 * @param schema - Schema to use for encoding
 * @param message - Message object to encode
 * @param typeName - Name of the message type
 * @returns Binary message data
 */
export function encodeMessage(
  schema: KiwiSchema,
  message: Record<string, unknown>,
  typeName: string
): Uint8Array {
  const buffer = new ByteBuffer();
  encodeMessageInternal({ schema, buffer, message, typeName, format: "standard" });
  return buffer.toUint8Array();
}

/**
 * Combine schema and data chunks into payload.
 *
 * @param schema - Compressed schema chunk
 * @param data - Compressed data chunk
 * @returns Combined payload
 */
export function combineChunks(
  schema: Uint8Array,
  data: Uint8Array
): Uint8Array {
  const buffer = new ByteBuffer();

  // First chunk: schema
  buffer.writeVarUint(schema.length);
  buffer.writeBytes(schema);

  // Second chunk: data
  buffer.writeVarUint(data.length);
  buffer.writeBytes(data);

  return buffer.toUint8Array();
}

/**
 * @file Streaming Kiwi encoder/decoder for fig files
 *
 * Provides generator-based streaming for processing large files
 * without loading everything into memory at once.
 */

import type { KiwiSchema, KiwiDefinition, KiwiField } from "../types";
import { ByteBuffer } from "./byte-buffer";
import { FigParseError, FigBuildError } from "../errors";

// =============================================================================
// Streaming Decoder
// =============================================================================

/** Decoded node change with metadata */
export type DecodedNodeChange = {
  /** Index in the nodeChanges array */
  readonly index: number;
  /** Total count of nodeChanges */
  readonly total: number;
  /** The decoded node data */
  readonly node: Record<string, unknown>;
};

/** Streaming decoder options */
export type StreamingDecoderOptions = {
  /** Schema for decoding (required) */
  readonly schema: KiwiSchema;
  /** Type name of the root message (default: "Message") */
  readonly rootType?: string;
  /** Type name for node changes (default: "NodeChange") */
  readonly nodeChangeType?: string;
};

/** Primitive type names */
type PrimitiveTypeName =
  | "bool"
  | "byte"
  | "int"
  | "uint"
  | "float"
  | "string"
  | "int64"
  | "uint64";

/** Primitive type IDs */
const PRIMITIVE_TYPES: Record<number, PrimitiveTypeName> = {
  [-1]: "bool",
  [-2]: "byte",
  [-3]: "int",
  [-4]: "uint",
  [-5]: "float",
  [-6]: "string",
  [-7]: "int64",
  [-8]: "uint64",
};

/**
 * Streaming decoder for fig message data.
 * Yields node changes one at a time instead of loading all into memory.
 */
// eslint-disable-next-line no-restricted-syntax -- Class appropriate for stateful decoder
export class StreamingFigDecoder {
  private readonly schema: KiwiSchema;
  private readonly rootType: string;
  private readonly nodeChangeType: string;
  private buffer: ByteBuffer | null = null;

  constructor(options: StreamingDecoderOptions) {
    this.schema = options.schema;
    this.rootType = options.rootType ?? "Message";
    this.nodeChangeType = options.nodeChangeType ?? "NodeChange";
  }

  /**
   * Decode and yield node changes one at a time.
   *
   * @param data - Decompressed message data
   * @yields DecodedNodeChange objects
   */
  *decodeNodeChanges(data: Uint8Array): Generator<DecodedNodeChange> {
    this.buffer = new ByteBuffer(data);

    const rootDef = this.schema.definitions.find(
      (d) => d.name === this.rootType
    );
    if (!rootDef) {
      throw new FigParseError(`Unknown root type: ${this.rootType}`);
    }

    // Parse Message fields until we hit nodeChanges
    const fieldMap = new Map(rootDef.fields.map((f) => [f.value, f]));
    const nodeChangesField = rootDef.fields.find(
      (f) => f.name === "nodeChanges"
    );

    if (!nodeChangesField) {
      throw new FigParseError("No nodeChanges field in Message type");
    }

    // Read message fields until nodeChanges or end
    // eslint-disable-next-line no-restricted-syntax -- Loop until sentinel
    let fieldIndex: number;
    while ((fieldIndex = this.buffer.readVarUint()) !== 0) {
      const field = fieldMap.get(fieldIndex);
      if (!field) {
        // Unknown field - stop
        break;
      }

      if (field.name === "nodeChanges") {
        // Found nodeChanges - yield each one
        const count = this.buffer.readVarUint();

        for (const i of Array(count).keys()) {
          const node = this.decodeDefinition(
            this.schema.definitions.find((d) => d.name === this.nodeChangeType)!
          );
          yield { index: i, total: count, node };
        }

        // Continue reading remaining fields
        continue;
      }

      // Skip other fields
      this.decodeFieldValue(field);
    }
  }

  /**
   * Decode the full message header (non-nodeChanges fields).
   *
   * @param data - Decompressed message data
   * @returns Message header fields (type, sessionID, etc.)
   */
  decodeHeader(data: Uint8Array): Record<string, unknown> {
    this.buffer = new ByteBuffer(data);

    const rootDef = this.schema.definitions.find(
      (d) => d.name === this.rootType
    );
    if (!rootDef) {
      throw new FigParseError(`Unknown root type: ${this.rootType}`);
    }

    const result: Record<string, unknown> = {};
    const fieldMap = new Map(rootDef.fields.map((f) => [f.value, f]));

    // eslint-disable-next-line no-restricted-syntax -- Loop until sentinel
    let fieldIndex: number;
    while ((fieldIndex = this.buffer.readVarUint()) !== 0) {
      const field = fieldMap.get(fieldIndex);
      if (!field) {
        break;
      }

      if (field.name === "nodeChanges") {
        // Just read count, don't decode nodes
        const count = this.buffer.readVarUint();
        result.nodeChangesCount = count;
        // Skip actual node data - caller should use decodeNodeChanges
        break;
      }

      result[field.name] = this.decodeFieldValue(field);
    }

    return result;
  }

  /**
   * Get the buffer offset after decoding header.
   * Useful for resuming at nodeChanges.
   */
  get offset(): number {
    return this.buffer?.offset ?? 0;
  }

  private decodeFieldValue(field: KiwiField): unknown {
    if (!this.buffer) {
      throw new FigParseError("No buffer");
    }

    if (field.isArray) {
      const count = this.buffer.readVarUint();
      const items: unknown[] = [];
      for (const _ of Array(count).keys()) {
        items.push(this.decodeValueByTypeId(field.typeId));
      }
      return items;
    }
    return this.decodeValueByTypeId(field.typeId);
  }

  private decodeValueByTypeId(typeId: number): unknown {
    if (!this.buffer) {
      throw new FigParseError("No buffer");
    }

    if (typeId < 0) {
      const primitiveType = PRIMITIVE_TYPES[typeId];
      if (primitiveType) {
        return this.decodePrimitive(primitiveType);
      }
      throw new FigParseError(`Unknown primitive type: ${typeId}`);
    }

    const definition = this.schema.definitions[typeId];
    if (!definition) {
      throw new FigParseError(`Unknown type index: ${typeId}`);
    }

    return this.decodeDefinition(definition);
  }

  private decodeDefinition(definition: KiwiDefinition): Record<string, unknown> {
    if (!this.buffer) {
      throw new FigParseError("No buffer");
    }

    const result: Record<string, unknown> = {};

    if (definition.kind === "STRUCT") {
      for (const field of definition.fields) {
        result[field.name] = this.decodeFieldValue(field);
      }
    } else if (definition.kind === "MESSAGE") {
      const fieldMap = new Map(definition.fields.map((f) => [f.value, f]));

      // eslint-disable-next-line no-restricted-syntax -- Loop until sentinel
      let fieldIndex: number;
      while ((fieldIndex = this.buffer.readVarUint()) !== 0) {
        const field = fieldMap.get(fieldIndex);
        if (field) {
          result[field.name] = this.decodeFieldValue(field);
        } else {
          break;
        }
      }
    } else if (definition.kind === "ENUM") {
      const value = this.buffer.readVarUint();
      const field = definition.fields.find((f) => f.value === value);
      return { value, name: field?.name ?? `unknown(${value})` };
    }

    return result;
  }

  private decodePrimitive(type: PrimitiveTypeName): unknown {
    if (!this.buffer) {
      throw new FigParseError("No buffer");
    }

    switch (type) {
      case "bool":
        return this.buffer.readByte() !== 0;
      case "byte":
        return this.buffer.readByte();
      case "int":
        return this.buffer.readVarInt();
      case "uint":
        return this.buffer.readVarUint();
      case "float":
        return this.buffer.readFloat32();
      case "string":
        return this.buffer.readNullString();
      case "int64":
        return this.buffer.readVarInt64();
      case "uint64":
        return this.buffer.readVarUint64();
    }
  }
}

// =============================================================================
// Streaming Encoder
// =============================================================================

/** Streaming encoder options */
export type StreamingEncoderOptions = {
  /** Schema for encoding (required) */
  readonly schema: KiwiSchema;
  /** Type name of the root message (default: "Message") */
  readonly rootType?: string;
  /** Type name for node changes (default: "NodeChange") */
  readonly nodeChangeType?: string;
};

/** Message header for streaming encoding */
export type MessageHeader = {
  /** Message type value */
  readonly type?: { value: number };
  /** Session ID */
  readonly sessionID?: number;
  /** Ack ID */
  readonly ackID?: number;
  /** Other header fields */
  readonly [key: string]: unknown;
};

/**
 * Streaming encoder for fig message data.
 * Allows writing node changes one at a time.
 */
// eslint-disable-next-line no-restricted-syntax -- Class appropriate for stateful encoder
export class StreamingFigEncoder {
  private readonly schema: KiwiSchema;
  private readonly rootType: string;
  private readonly nodeChangeType: string;
  private buffer: ByteBuffer;
  private nodeCountOffset: number = -1;
  private nodeCount: number = 0;
  private finalized: boolean = false;

  constructor(options: StreamingEncoderOptions) {
    this.schema = options.schema;
    this.rootType = options.rootType ?? "Message";
    this.nodeChangeType = options.nodeChangeType ?? "NodeChange";
    // Create buffer in write mode (no initial data)
    this.buffer = new ByteBuffer();
  }

  /**
   * Write the message header.
   * Must be called before writeNodeChange.
   *
   * @param header - Message header fields
   */
  writeHeader(header: MessageHeader): void {
    const rootDef = this.schema.definitions.find(
      (d) => d.name === this.rootType
    );
    if (!rootDef) {
      throw new FigParseError(`Unknown root type: ${this.rootType}`);
    }

    // Write header fields
    for (const field of rootDef.fields) {
      if (field.name === "nodeChanges") {
        // Write field index for nodeChanges
        this.buffer.writeVarUint(field.value);
        // Reserve space for count - we'll fill it in at the end
        this.nodeCountOffset = this.buffer.length;
        // Write a placeholder count (will be updated in finalize)
        this.buffer.writeVarUint(0);
        continue;
      }

      const value = header[field.name];
      if (value !== undefined && value !== null) {
        this.buffer.writeVarUint(field.value);
        this.encodeFieldValue(field, value);
      }
    }
  }

  /**
   * Write a single node change.
   *
   * @param node - Node change data
   */
  writeNodeChange(node: Record<string, unknown>): void {
    if (this.nodeCountOffset < 0) {
      throw new FigParseError("Must call writeHeader before writeNodeChange");
    }
    if (this.finalized) {
      throw new FigParseError("Encoder already finalized");
    }

    const nodeChangeDef = this.schema.definitions.find(
      (d) => d.name === this.nodeChangeType
    );
    if (!nodeChangeDef) {
      throw new FigParseError(`Unknown type: ${this.nodeChangeType}`);
    }

    this.encodeDefinition(nodeChangeDef, node);
    this.nodeCount++;
  }

  /**
   * Finalize encoding and return the result.
   *
   * @returns Encoded message data
   */
  finalize(): Uint8Array {
    if (this.finalized) {
      throw new FigParseError("Encoder already finalized");
    }
    this.finalized = true;

    // Write end marker
    this.buffer.writeVarUint(0);

    // Get the result
    const result = this.buffer.toUint8Array();

    // Patch the node count
    // Note: This only works if count fits in same VarUint size
    if (this.nodeCountOffset >= 0) {
      const countBuffer = new ByteBuffer();
      countBuffer.writeVarUint(this.nodeCount);
      const countBytes = countBuffer.toUint8Array();

      // Simple case: count fits in 1 byte (count < 128)
      if (countBytes.length === 1) {
        result[this.nodeCountOffset] = countBytes[0];
      } else {
        // Complex case: need to shift data - for now just warn
        console.warn(
          "Node count requires multi-byte VarUint, result may be invalid"
        );
      }
    }

    return result;
  }

  /**
   * Create an async generator for writing nodes from an async source.
   *
   * @param header - Message header
   * @param nodes - Async iterable of nodes
   * @yields Progress updates
   */
  async *encodeAsync(
    header: MessageHeader,
    nodes: AsyncIterable<Record<string, unknown>>
  ): AsyncGenerator<{ index: number; node: Record<string, unknown> }> {
    this.writeHeader(header);

    // eslint-disable-next-line no-restricted-syntax -- Async iteration
    let index = 0;
    for await (const node of nodes) {
      this.writeNodeChange(node);
      yield { index, node };
      index++;
    }
  }

  private encodeFieldValue(field: KiwiField, value: unknown): void {
    if (field.isArray) {
      if (!Array.isArray(value)) {
        throw new FigBuildError(
          `Expected array for field "${field.name}", got ${typeof value}`
        );
      }
      this.buffer.writeVarUint(value.length);
      for (const item of value) {
        this.encodeValueByTypeId(field.typeId, item);
      }
    } else {
      this.encodeValueByTypeId(field.typeId, value);
    }
  }

  private encodeValueByTypeId(typeId: number, value: unknown): void {
    if (typeId < 0) {
      const primitiveType = PRIMITIVE_TYPES[typeId];
      if (!primitiveType) {
        throw new FigBuildError(`Unknown primitive type ID: ${typeId}`);
      }
      this.encodePrimitive(primitiveType, value);
      return;
    }

    const definition = this.schema.definitions[typeId];
    if (!definition) {
      throw new FigBuildError(`Unknown type index: ${typeId}`);
    }

    if (typeof value !== "object" || value === null) {
      throw new FigBuildError(
        `Expected object for type "${definition.name}", got ${value === null ? "null" : typeof value}`
      );
    }

    this.encodeDefinition(definition, value as Record<string, unknown>);
  }

  private encodeDefinition(
    definition: KiwiDefinition,
    value: Record<string, unknown>
  ): void {
    if (definition.kind === "STRUCT") {
      for (const field of definition.fields) {
        this.encodeFieldValue(field, value[field.name]);
      }
    } else if (definition.kind === "MESSAGE") {
      for (const field of definition.fields) {
        const fieldValue = value[field.name];
        if (fieldValue !== undefined && fieldValue !== null) {
          this.buffer.writeVarUint(field.value);
          this.encodeFieldValue(field, fieldValue);
        }
      }
      this.buffer.writeVarUint(0);
    } else if (definition.kind === "ENUM") {
      const enumValue = this.extractEnumValue(value);
      this.buffer.writeVarUint(enumValue);
    }
  }

  private extractEnumValue(value: unknown): number {
    if (typeof value !== "object" || value === null) {
      throw new FigBuildError(
        `Expected enum object with "value" property, got ${value === null ? "null" : typeof value}`
      );
    }
    if (!("value" in value)) {
      throw new FigBuildError(
        `Expected enum object with "value" property, got object without "value"`
      );
    }
    const enumValue = (value as { value: unknown }).value;
    if (typeof enumValue !== "number") {
      throw new FigBuildError(
        `Expected enum "value" to be number, got ${typeof enumValue}`
      );
    }
    return enumValue;
  }

  private encodePrimitive(type: PrimitiveTypeName, value: unknown): void {
    switch (type) {
      case "bool":
        if (typeof value !== "boolean" && typeof value !== "number") {
          throw new FigBuildError(`Expected boolean for type "bool", got ${typeof value}`);
        }
        this.buffer.writeByte(value ? 1 : 0);
        break;
      case "byte":
        this.assertNumber(value, "byte");
        this.buffer.writeByte(value);
        break;
      case "int":
        this.assertNumber(value, "int");
        this.buffer.writeVarInt(value);
        break;
      case "uint":
        this.assertNumber(value, "uint");
        this.buffer.writeVarUint(value);
        break;
      case "float":
        this.assertNumber(value, "float");
        this.writeFloat32(value);
        break;
      case "string":
        if (typeof value !== "string") {
          throw new FigBuildError(`Expected string for type "string", got ${typeof value}`);
        }
        this.writeNullString(value);
        break;
      case "int64":
        this.assertBigint(value, "int64");
        this.buffer.writeVarInt64(value);
        break;
      case "uint64":
        this.assertBigint(value, "uint64");
        this.buffer.writeVarUint64(value);
        break;
    }
  }

  private assertNumber(value: unknown, type: string): asserts value is number {
    if (typeof value !== "number") {
      throw new FigBuildError(`Expected number for type "${type}", got ${typeof value}`);
    }
  }

  private assertBigint(value: unknown, type: string): asserts value is bigint {
    if (typeof value !== "bigint") {
      throw new FigBuildError(`Expected bigint for type "${type}", got ${typeof value}`);
    }
  }

  private writeFloat32(value: number): void {
    if (value === 0) {
      this.buffer.writeByte(0);
      return;
    }

    // Convert to IEEE 754 bits
    const floatBuffer = new ArrayBuffer(4);
    const floatView = new DataView(floatBuffer);
    floatView.setFloat32(0, value, true);
    const bits = floatView.getUint32(0, true);

    // Rotate bits: (bits >> 23) | (bits << 9)
    const rotated = ((bits >>> 23) | (bits << 9)) >>> 0;

    // Write as 4 bytes LE
    this.buffer.writeByte(rotated & 0xff);
    this.buffer.writeByte((rotated >> 8) & 0xff);
    this.buffer.writeByte((rotated >> 16) & 0xff);
    this.buffer.writeByte((rotated >> 24) & 0xff);
  }

  private writeNullString(value: string): void {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(value);
    for (const byte of bytes) {
      this.buffer.writeByte(byte);
    }
    this.buffer.writeByte(0); // null terminator
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Create a streaming decoder and yield node changes.
 *
 * @param schema - Schema for decoding
 * @param data - Decompressed message data
 * @yields DecodedNodeChange objects
 */
export function* streamNodeChanges(
  schema: KiwiSchema,
  data: Uint8Array
): Generator<DecodedNodeChange> {
  const decoder = new StreamingFigDecoder({ schema });
  yield* decoder.decodeNodeChanges(data);
}

/**
 * Process node changes with a callback, returning results.
 *
 * @param schema - Schema for decoding
 * @param data - Decompressed message data
 * @param processor - Callback for each node
 * @returns Array of processed results
 */
export function processNodeChanges<T>(
  schema: KiwiSchema,
  data: Uint8Array,
  processor: (node: Record<string, unknown>, index: number, total: number) => T
): T[] {
  const results: T[] = [];
  for (const { node, index, total } of streamNodeChanges(schema, data)) {
    results.push(processor(node, index, total));
  }
  return results;
}

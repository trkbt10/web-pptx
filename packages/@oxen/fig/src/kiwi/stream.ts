/**
 * @file Streaming Kiwi encoder/decoder for fig files
 *
 * Provides generator-based streaming for processing large files
 * without loading everything into memory at once.
 */

import type { KiwiSchema } from "../types";
import { ByteBuffer } from "./byte-buffer";
import { FigParseError, FigBuildError } from "../errors";

// Import from core
import { decodePrimitive, encodePrimitiveStrict } from "./core/primitive-codec";
import { decodeField, encodeField } from "./core/field-codec";
import { decodeDefinition, encodeDefinition } from "./core/definition-codec";
import { iterateMessageFields } from "./core/message-iterator";
import { getPrimitiveTypeName, isPrimitiveTypeId } from "./core/primitives";
import type { ValueDecoder, ValueEncoder } from "./core/types";

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
  private readonly valueDecoder: ValueDecoder;

  constructor(options: StreamingDecoderOptions) {
    this.schema = options.schema;
    this.rootType = options.rootType ?? "Message";
    this.nodeChangeType = options.nodeChangeType ?? "NodeChange";
    this.valueDecoder = this.createValueDecoder();
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

    const nodeChangesField = rootDef.fields.find(
      (f) => f.name === "nodeChanges"
    );
    if (!nodeChangesField) {
      throw new FigParseError("No nodeChanges field in Message type");
    }

    for (const { field } of iterateMessageFields({
      buffer: this.buffer,
      definition: rootDef,
    })) {
      if (field.name === "nodeChanges") {
        // Found nodeChanges - yield each one
        const count = this.buffer.readVarUint();
        const nodeChangeDef = this.schema.definitions.find(
          (d) => d.name === this.nodeChangeType
        )!;

        for (const i of Array(count).keys()) {
          const node = decodeDefinition({
            buffer: this.buffer,
            schema: this.schema,
            definition: nodeChangeDef,
            format: "fig",
            decodeValue: this.valueDecoder,
          }) as Record<string, unknown>;
          yield { index: i, total: count, node };
        }
        continue;
      }

      // Decode and discard other fields
      decodeField({
        buffer: this.buffer,
        schema: this.schema,
        field,
        format: "fig",
        decodeValue: this.valueDecoder,
      });
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

    for (const { field } of iterateMessageFields({
      buffer: this.buffer,
      definition: rootDef,
    })) {
      if (field.name === "nodeChanges") {
        // Just read count, don't decode nodes
        const count = this.buffer.readVarUint();
        result.nodeChangesCount = count;
        // Skip actual node data - caller should use decodeNodeChanges
        break;
      }

      result[field.name] = decodeField({
        buffer: this.buffer,
        schema: this.schema,
        field,
        format: "fig",
        decodeValue: this.valueDecoder,
      });
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

  private createValueDecoder(): ValueDecoder {
    const decodeValue: ValueDecoder = (options) => {
      const { buffer, schema, typeId } = options;
      if (isPrimitiveTypeId(typeId)) {
        const typeName = getPrimitiveTypeName(typeId)!;
        return decodePrimitive({ buffer, type: typeName, format: "fig" });
      }

      const definition = schema.definitions[typeId];
      if (!definition) {
        throw new FigParseError(`Unknown type index: ${typeId}`);
      }

      return decodeDefinition({
        buffer,
        schema,
        definition,
        format: "fig",
        decodeValue,
      });
    };
    return decodeValue;
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
  private readonly valueEncoder: ValueEncoder;

  constructor(options: StreamingEncoderOptions) {
    this.schema = options.schema;
    this.rootType = options.rootType ?? "Message";
    this.nodeChangeType = options.nodeChangeType ?? "NodeChange";
    // Create buffer in write mode (no initial data)
    this.buffer = new ByteBuffer();
    this.valueEncoder = this.createValueEncoder();
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
        encodeField({
          buffer: this.buffer,
          schema: this.schema,
          field,
          value,
          format: "fig",
          encodeValue: this.valueEncoder,
          strict: true,
        });
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

    encodeDefinition({
      buffer: this.buffer,
      schema: this.schema,
      definition: nodeChangeDef,
      message: node,
      format: "fig",
      encodeValue: this.valueEncoder,
      strict: true,
    });
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

  private createValueEncoder(): ValueEncoder {
    const encodeValue: ValueEncoder = (options) => {
      const { buffer, schema, typeId, value, strict } = options;
      if (isPrimitiveTypeId(typeId)) {
        const typeName = getPrimitiveTypeName(typeId)!;
        encodePrimitiveStrict({ buffer, type: typeName, value, format: "fig" });
        return;
      }

      const definition = schema.definitions[typeId];
      if (!definition) {
        throw new FigBuildError(`Unknown type index: ${typeId}`);
      }

      if (typeof value !== "object" || value === null) {
        throw new FigBuildError(
          `Expected object for type "${definition.name}", got ${value === null ? "null" : typeof value}`
        );
      }

      encodeDefinition({
        buffer,
        schema,
        definition,
        message: value as Record<string, unknown>,
        format: "fig",
        encodeValue,
        strict,
      });
    };
    return encodeValue;
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

/**
 * @file Streaming encoder/decoder unit tests
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { inflateRaw } from "pako";
import {
  StreamingFigDecoder,
  StreamingFigEncoder,
  streamNodeChanges,
  processNodeChanges,
} from "./stream";
import { decodeFigSchema, splitFigChunks } from "./decoder";
import { parseFigHeader, getPayload } from "../parser";

describe("StreamingFigDecoder", () => {
  const figPath = path.join(__dirname, "../../example.canvas.fig");

  it("yields node changes one at a time", () => {
    if (!fs.existsSync(figPath)) {
      console.log("Skipping: example.canvas.fig not found");
      return;
    }

    const data = new Uint8Array(fs.readFileSync(figPath));
    const header = parseFigHeader(data);
    const payload = getPayload(data);
    const chunks = splitFigChunks(payload, header.payloadSize);
    const schemaData = inflateRaw(chunks.schema);
    const msgData = inflateRaw(chunks.data);
    const schema = decodeFigSchema(schemaData);

    const decoder = new StreamingFigDecoder({ schema });
    const nodes: Record<string, unknown>[] = [];

    for (const { node, index, total } of decoder.decodeNodeChanges(msgData)) {
      expect(index).toBe(nodes.length);
      expect(total).toBe(6);
      nodes.push(node);
    }

    expect(nodes.length).toBe(6);

    // Check first node is Document
    expect(nodes[0].name).toBe("Document");
    const docType = nodes[0].type as { name: string };
    expect(docType.name).toBe("DOCUMENT");

    // Check other nodes
    expect(nodes[1].name).toBe("Page 1");
    expect(nodes[2].name).toBe("Internal Only Canvas");
  });

  it("decodes header separately", () => {
    if (!fs.existsSync(figPath)) {
      return;
    }

    const data = new Uint8Array(fs.readFileSync(figPath));
    const header = parseFigHeader(data);
    const payload = getPayload(data);
    const chunks = splitFigChunks(payload, header.payloadSize);
    const schemaData = inflateRaw(chunks.schema);
    const msgData = inflateRaw(chunks.data);
    const schema = decodeFigSchema(schemaData);

    const decoder = new StreamingFigDecoder({ schema });
    const msgHeader = decoder.decodeHeader(msgData);

    expect(msgHeader.type).toBeDefined();
    const msgType = msgHeader.type as { name: string };
    expect(msgType.name).toBe("NODE_CHANGES");
    expect(msgHeader.nodeChangesCount).toBe(6);
  });
});

describe("streamNodeChanges helper", () => {
  const figPath = path.join(__dirname, "../../example.canvas.fig");

  it("streams node changes with generator", () => {
    if (!fs.existsSync(figPath)) {
      return;
    }

    const data = new Uint8Array(fs.readFileSync(figPath));
    const header = parseFigHeader(data);
    const payload = getPayload(data);
    const chunks = splitFigChunks(payload, header.payloadSize);
    const schemaData = inflateRaw(chunks.schema);
    const msgData = inflateRaw(chunks.data);
    const schema = decodeFigSchema(schemaData);

    const names: string[] = [];
    for (const { node } of streamNodeChanges(schema, msgData)) {
      names.push(node.name as string);
    }

    expect(names).toEqual([
      "Document",
      "Page 1",
      "Internal Only Canvas",
      "esbuild",
      "Vector",
      "Ellipse",
    ]);
  });
});

describe("processNodeChanges helper", () => {
  const figPath = path.join(__dirname, "../../example.canvas.fig");

  it("processes nodes with callback", () => {
    if (!fs.existsSync(figPath)) {
      return;
    }

    const data = new Uint8Array(fs.readFileSync(figPath));
    const header = parseFigHeader(data);
    const payload = getPayload(data);
    const chunks = splitFigChunks(payload, header.payloadSize);
    const schemaData = inflateRaw(chunks.schema);
    const msgData = inflateRaw(chunks.data);
    const schema = decodeFigSchema(schemaData);

    const results = processNodeChanges(schema, msgData, (node, index, total) => {
      return {
        index,
        total,
        name: node.name as string,
        type: (node.type as { name: string }).name,
      };
    });

    expect(results.length).toBe(6);
    expect(results[0]).toEqual({
      index: 0,
      total: 6,
      name: "Document",
      type: "DOCUMENT",
    });
    expect(results[1]).toEqual({
      index: 1,
      total: 6,
      name: "Page 1",
      type: "CANVAS",
    });
  });
});

describe("StreamingFigEncoder", () => {
  it("encodes nodes one at a time", () => {
    // Simple schema for testing
    const schema = {
      definitions: [
        {
          name: "MessageType",
          kind: "ENUM" as const,
          fields: [
            { name: "NODE_CHANGES", type: "uint", typeId: -4, isArray: false, value: 1 },
          ],
        },
        {
          name: "GUID",
          kind: "STRUCT" as const,
          fields: [
            { name: "sessionID", type: "uint", typeId: -4, isArray: false, value: 1 },
            { name: "localID", type: "uint", typeId: -4, isArray: false, value: 2 },
          ],
        },
        {
          name: "NodeChange",
          kind: "MESSAGE" as const,
          fields: [
            { name: "guid", type: "GUID", typeId: 1, isArray: false, value: 1 },
            { name: "name", type: "string", typeId: -6, isArray: false, value: 5 },
          ],
        },
        {
          name: "Message",
          kind: "MESSAGE" as const,
          fields: [
            { name: "type", type: "MessageType", typeId: 0, isArray: false, value: 1 },
            { name: "sessionID", type: "uint", typeId: -4, isArray: false, value: 2 },
            { name: "nodeChanges", type: "NodeChange", typeId: 2, isArray: true, value: 4 },
          ],
        },
      ],
    };

    const encoder = new StreamingFigEncoder({ schema });

    encoder.writeHeader({
      type: { value: 1 },
      sessionID: 0,
    });

    encoder.writeNodeChange({
      guid: { sessionID: 0, localID: 0 },
      name: "Test Node 1",
    });

    encoder.writeNodeChange({
      guid: { sessionID: 0, localID: 1 },
      name: "Test Node 2",
    });

    const result = encoder.finalize();
    expect(result.length).toBeGreaterThan(0);

    // Decode and verify
    const decoder = new StreamingFigDecoder({ schema });
    const nodes: Record<string, unknown>[] = [];

    for (const { node } of decoder.decodeNodeChanges(result)) {
      nodes.push(node);
    }

    expect(nodes.length).toBe(2);
    expect(nodes[0].name).toBe("Test Node 1");
    expect(nodes[1].name).toBe("Test Node 2");
  });
});

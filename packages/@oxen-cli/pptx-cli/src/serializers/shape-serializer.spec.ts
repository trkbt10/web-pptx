/**
 * @file Tests for shape-serializer
 */

import { serializeShape } from "./shape-serializer";
import type { SpShape, PicShape } from "@oxen-office/pptx/domain/shape";
import type { Pixels, Degrees } from "@oxen-office/ooxml/domain/units";

describe("shape-serializer", () => {
  describe("serializeShape", () => {
    it("serializes an sp shape with text", () => {
      const shape: SpShape = {
        type: "sp",
        nonVisual: { id: "1", name: "Title" },
        properties: {
          transform: {
            x: 100 as Pixels,
            y: 50 as Pixels,
            width: 800 as Pixels,
            height: 100 as Pixels,
            rotation: 0 as Degrees,
            flipH: false,
            flipV: false,
          },
        },
        textBody: {
          bodyProperties: {},
          paragraphs: [
            {
              properties: {},
              runs: [{ type: "text", text: "Hello World" }],
            },
          ],
        },
      };

      const result = serializeShape(shape);

      expect(result.id).toBe("1");
      expect(result.name).toBe("Title");
      expect(result.type).toBe("sp");
      expect(result.text).toBe("Hello World");
      expect(result.bounds).toEqual({ x: 100, y: 50, width: 800, height: 100 });
    });

    it("serializes an sp shape with placeholder", () => {
      const shape: SpShape = {
        type: "sp",
        nonVisual: { id: "2", name: "Title 1" },
        placeholder: { type: "title" },
        properties: {},
      };

      const result = serializeShape(shape);

      expect(result.placeholder).toEqual({ type: "title", idx: undefined });
    });

    it("serializes a pic shape", () => {
      const shape: PicShape = {
        type: "pic",
        nonVisual: { id: "3", name: "Picture 1" },
        blipFill: { resourceId: "rId2" },
        properties: {
          transform: {
            x: 200 as Pixels,
            y: 200 as Pixels,
            width: 400 as Pixels,
            height: 300 as Pixels,
            rotation: 0 as Degrees,
            flipH: false,
            flipV: false,
          },
        },
      };

      const result = serializeShape(shape);

      expect(result.id).toBe("3");
      expect(result.name).toBe("Picture 1");
      expect(result.type).toBe("pic");
      expect(result.resourceId).toBe("rId2");
      expect(result.bounds).toEqual({ x: 200, y: 200, width: 400, height: 300 });
    });

    it("omits undefined text from sp shape", () => {
      const shape: SpShape = {
        type: "sp",
        nonVisual: { id: "1", name: "Shape" },
        properties: {},
      };

      const result = serializeShape(shape);

      expect(result.text).toBeUndefined();
    });
  });
});

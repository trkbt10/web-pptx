/**
 * @file Tests for custom-geometry-builder
 */

import { buildCustomGeometryFromSpec } from "./custom-geometry-builder";

describe("custom-geometry-builder", () => {
  it("builds basic path commands", () => {
    const result = buildCustomGeometryFromSpec({
      paths: [
        {
          width: 100,
          height: 100,
          fill: "norm",
          stroke: true,
          extrusionOk: true,
          commands: [
            { type: "moveTo", x: 0, y: 0 },
            { type: "lineTo", x: 100, y: 0 },
            { type: "arcTo", widthRadius: 50, heightRadius: 50, startAngle: 0, swingAngle: 90 },
            { type: "quadBezierTo", control: { x: 80, y: 10 }, end: { x: 100, y: 100 } },
            { type: "cubicBezierTo", control1: { x: 10, y: 10 }, control2: { x: 20, y: 20 }, end: { x: 30, y: 30 } },
            { type: "close" },
          ],
        },
      ],
    });

    expect(result.type).toBe("custom");
    expect(result.paths).toHaveLength(1);
    expect(result.paths[0]?.commands.map((c) => c.type)).toEqual([
      "moveTo",
      "lineTo",
      "arcTo",
      "quadBezierTo",
      "cubicBezierTo",
      "close",
    ]);
  });

  it("throws on empty paths", () => {
    expect(() => buildCustomGeometryFromSpec({ paths: [] })).toThrow(/customGeometry\.paths/);
  });
});

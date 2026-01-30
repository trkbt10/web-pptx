/**
 * @file Tests for blip-effects-builder
 */

import { buildBlipEffectsFromSpec } from "./blip-effects-builder";

describe("blip-effects-builder", () => {
  it("builds threshold-based effects with percent scaling", () => {
    const result = buildBlipEffectsFromSpec({
      alphaBiLevel: { threshold: 50 },
      biLevel: { threshold: 25 },
      alphaRepl: { alpha: 75 },
      alphaModFix: 80,
    });

    expect(result).toEqual({
      alphaBiLevel: { threshold: 50_000 },
      biLevel: { threshold: 25_000 },
      alphaRepl: { alpha: 75_000 },
      alphaModFix: { amount: 80_000 },
    });
  });

  it("builds boolean effects", () => {
    const result = buildBlipEffectsFromSpec({
      alphaCeiling: true,
      alphaFloor: true,
      alphaInv: true,
      alphaMod: true,
      grayscale: true,
    });

    expect(result).toEqual({
      alphaCeiling: true,
      alphaFloor: true,
      alphaInv: true,
      alphaMod: true,
      grayscale: true,
    });
  });

  it("builds colorChange and colorReplace with color specs", () => {
    const result = buildBlipEffectsFromSpec({
      colorChange: {
        from: "FF0000",
        to: { theme: "accent1", lumMod: 80 },
      },
      colorReplace: { color: { theme: "accent2" } },
      duotone: { colors: ["00FF00", { theme: "accent3" }] },
    });

    expect(result.colorChange).toEqual({
      from: { spec: { type: "srgb", value: "FF0000" } },
      to: { spec: { type: "scheme", value: "accent1" }, transform: { lumMod: 80_000 } },
      useAlpha: false,
    });

    expect(result.colorReplace).toEqual({
      color: { spec: { type: "scheme", value: "accent2" }, transform: undefined },
    });

    expect(result.duotone).toEqual({
      colors: [
        { spec: { type: "srgb", value: "00FF00" } },
        { spec: { type: "scheme", value: "accent3" }, transform: undefined },
      ],
    });
  });
});


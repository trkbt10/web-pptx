import { describe, it, expect, vi } from "vitest";
import { parseToUnicodeCMap } from "./cmap-parser";

function makeSimpleBfRangeCMap(
  startHex: string,
  endHex: string,
  destStartHex: string
): string {
  return `beginbfrange\n<${startHex}> <${endHex}> <${destStartHex}>\nendbfrange`;
}

describe("parseToUnicodeCMap", () => {
  it("processes a small bfrange fully (size < 256)", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const cmap = makeSimpleBfRangeCMap("0000", "0003", "0041");

    const { mapping } = parseToUnicodeCMap(cmap);

    expect(mapping.size).toBe(4);
    expect(mapping.get(0x0000)).toBe("A");
    expect(mapping.get(0x0001)).toBe("B");
    expect(mapping.get(0x0002)).toBe("C");
    expect(mapping.get(0x0003)).toBe("D");
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("does not truncate at the boundary (size = 256)", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const cmap = makeSimpleBfRangeCMap("0000", "00ff", "0020");

    const { mapping } = parseToUnicodeCMap(cmap);

    expect(mapping.size).toBe(256);
    expect(mapping.get(0x0000)).toBe(" ");
    expect(mapping.get(0x00ff)).toBe(String.fromCodePoint(0x0020 + 0x00ff));
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("truncates a large bfrange (size > 256) and warns", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const cmap = makeSimpleBfRangeCMap("0000", "0100", "0020");

    const { mapping } = parseToUnicodeCMap(cmap);

    expect(mapping.size).toBe(256);
    expect(mapping.get(0x00ff)).toBe(String.fromCodePoint(0x0020 + 0x00ff));
    expect(mapping.get(0x0100)).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0]?.[0])).toContain("limiting to 256");

    warnSpy.mockRestore();
  });

  it("allows overriding the limit via options", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const cmap = makeSimpleBfRangeCMap("0000", "0014", "0041"); // 21 entries

    const { mapping } = parseToUnicodeCMap(cmap, { maxRangeEntries: 10 });

    expect(mapping.size).toBe(10);
    expect(mapping.get(0x0000)).toBe("A");
    expect(mapping.get(0x0009)).toBe("J");
    expect(mapping.get(0x000a)).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0]?.[0])).toContain("limiting to 10");

    warnSpy.mockRestore();
  });
});


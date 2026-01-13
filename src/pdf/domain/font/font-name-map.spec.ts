/**
 * @file Font name normalization tests
 */
import { describe, it, expect } from "vitest";
import { normalizeFontFamily } from "./font-name-map";

describe("normalizeFontFamily", () => {
  describe("basic normalization", () => {
    it("should remove leading slash", () => {
      expect(normalizeFontFamily("/Helvetica")).toBe("Arial");
    });

    it("should remove subset prefix", () => {
      expect(normalizeFontFamily("ABCDEF+Helvetica")).toBe("Arial");
    });

    it("should handle combined transformations", () => {
      expect(normalizeFontFamily("/XYZABC+MS-PGothic")).toBe("MS PGothic");
    });
  });

  describe("PDF Standard 14 fonts", () => {
    it("should map Helvetica to Arial", () => {
      expect(normalizeFontFamily("Helvetica")).toBe("Arial");
      expect(normalizeFontFamily("Helvetica-Bold")).toBe("Arial");
    });

    it("should map Times-Roman to Times New Roman", () => {
      expect(normalizeFontFamily("Times-Roman")).toBe("Times New Roman");
    });

    it("should map Courier to Courier New", () => {
      expect(normalizeFontFamily("Courier")).toBe("Courier New");
    });
  });

  describe("Japanese CID fonts", () => {
    it("should map MS-Gothic correctly", () => {
      expect(normalizeFontFamily("MS-Gothic")).toBe("MS Gothic");
      expect(normalizeFontFamily("/ABCDEF+MS-Gothic")).toBe("MS Gothic");
    });

    it("should map MS-PGothic correctly (proportional)", () => {
      expect(normalizeFontFamily("MS-PGothic")).toBe("MS PGothic");
      expect(normalizeFontFamily("/XYZABC+MS-PGothic")).toBe("MS PGothic");
    });

    it("should map MS-Mincho correctly", () => {
      expect(normalizeFontFamily("MS-Mincho")).toBe("MS Mincho");
    });

    it("should map MS-PMincho correctly (proportional)", () => {
      expect(normalizeFontFamily("MS-PMincho")).toBe("MS PMincho");
    });
  });

  describe("unknown fonts", () => {
    it("should normalize unknown font names", () => {
      expect(normalizeFontFamily("ABCDEF+CustomFont-Regular")).toBe("CustomFont Regular");
      expect(normalizeFontFamily("Hiragino-Sans")).toBe("Hiragino Sans");
    });
  });
});

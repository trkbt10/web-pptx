/**
 * @file Slide styles tests
 *
 * Tests for style consistency between editable and readonly modes
 */

import { describe, it, expect } from "vitest";
import {
  getThumbnailContainerStyle,
  getDeleteButtonStyle,
  getNumberBadgeStyle,
} from "./styles";

// =============================================================================
// Thumbnail container styles
// =============================================================================

describe("getThumbnailContainerStyle", () => {
  const aspectRatio = "1.7778"; // 16:9

  describe("selection ring behavior (uses box-shadow to prevent layout shift)", () => {
    it("has no selection ring when not selected or active", () => {
      const style = getThumbnailContainerStyle(
        aspectRatio,
        false, // isSelected
        false, // isPrimary
        false  // isActive
      );

      // No border - uses box-shadow only
      expect(style.border).toBeUndefined();
      // Has base shadow but no inset selection ring
      expect(style.boxShadow).not.toContain("inset");
    });

    it("has inset box-shadow ring when selected", () => {
      const style = getThumbnailContainerStyle(
        aspectRatio,
        true,  // isSelected
        true,  // isPrimary
        false  // isActive
      );

      // Uses inset box-shadow for selection (no layout shift)
      expect(style.boxShadow).toContain("inset");
    });

    it("has inset box-shadow ring when active (current slide)", () => {
      const style = getThumbnailContainerStyle(
        aspectRatio,
        false, // isSelected
        false, // isPrimary
        true   // isActive
      );

      // Uses inset box-shadow for active state (no layout shift)
      expect(style.boxShadow).toContain("inset");
    });
  });

  describe("consistent appearance", () => {
    it("has white background", () => {
      const style = getThumbnailContainerStyle(aspectRatio, false, false, false);
      expect(style.backgroundColor).toBe("#fff");
    });

    it("has correct aspect ratio", () => {
      const style = getThumbnailContainerStyle(aspectRatio, false, false, false);
      expect(style.aspectRatio).toBe(aspectRatio);
    });

    it("has box shadow", () => {
      const style = getThumbnailContainerStyle(aspectRatio, false, false, false);
      expect(style.boxShadow).toBeDefined();
      expect(style.boxShadow).not.toBe("none");
    });

    it("has overflow hidden", () => {
      const style = getThumbnailContainerStyle(aspectRatio, false, false, false);
      expect(style.overflow).toBe("hidden");
    });
  });

  describe("layout stability", () => {
    it("produces same layout properties regardless of selection state", () => {
      const notSelected = getThumbnailContainerStyle(aspectRatio, false, false, false);
      const selected = getThumbnailContainerStyle(aspectRatio, true, true, false);

      // Layout properties should be identical (no layout shift)
      expect(notSelected.width).toBe(selected.width);
      expect(notSelected.height).toBe(selected.height);
      expect(notSelected.aspectRatio).toBe(selected.aspectRatio);
      expect(notSelected.borderRadius).toBe(selected.borderRadius);
      expect(notSelected.overflow).toBe(selected.overflow);

      // Only boxShadow differs (visual, not layout)
      expect(notSelected.boxShadow).not.toBe(selected.boxShadow);
    });
  });
});

// =============================================================================
// Delete button styles
// =============================================================================

describe("getDeleteButtonStyle", () => {
  describe("visibility", () => {
    it("is visible when visible=true", () => {
      const style = getDeleteButtonStyle(true);
      expect(style.opacity).toBe(1);
    });

    it("is hidden when visible=false", () => {
      const style = getDeleteButtonStyle(false);
      expect(style.opacity).toBe(0);
    });
  });

  describe("appearance", () => {
    it("has dark background (not red)", () => {
      const style = getDeleteButtonStyle(true);
      // Should be something like rgba(0,0,0,0.6), not a red color
      expect(style.backgroundColor).toMatch(/rgba?\s*\(\s*0\s*,\s*0\s*,\s*0/i);
    });

    it("has white text", () => {
      const style = getDeleteButtonStyle(true);
      expect(style.color).toBe("#fff");
    });

    it("is positioned inside thumbnail (not outside)", () => {
      const style = getDeleteButtonStyle(true);
      // Position should be small positive values, not negative
      expect(parseInt(style.top as string)).toBeGreaterThanOrEqual(0);
      expect(parseInt(style.right as string)).toBeGreaterThanOrEqual(0);
    });

    it("is not circular (has border-radius but not 50%)", () => {
      const style = getDeleteButtonStyle(true);
      // Should be small border-radius, not 50%
      expect(style.borderRadius).not.toBe("50%");
    });
  });
});

// =============================================================================
// Number badge styles
// =============================================================================

describe("getNumberBadgeStyle", () => {
  describe("vertical orientation", () => {
    it("has min-width for number alignment", () => {
      const style = getNumberBadgeStyle("vertical");
      expect(style.minWidth).toBeDefined();
    });
  });

  describe("horizontal orientation", () => {
    it("has margin for spacing from slide", () => {
      const style = getNumberBadgeStyle("horizontal");
      expect(style.marginBottom).toBeDefined();
    });
  });

  describe("common properties", () => {
    it("has centered text", () => {
      const styleV = getNumberBadgeStyle("vertical");
      const styleH = getNumberBadgeStyle("horizontal");

      expect(styleV.textAlign).toBe("center");
      expect(styleH.textAlign).toBe("center");
    });

    it("prevents text selection", () => {
      const style = getNumberBadgeStyle("vertical");
      expect(style.userSelect).toBe("none");
    });
  });
});

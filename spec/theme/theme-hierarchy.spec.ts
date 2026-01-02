/**
 * @file Theme hierarchy tests
 *
 * Tests for theme hierarchy (Slide → Layout → Master → Theme) and test data integrity.
 *
 * @see ECMA-376 Part 1, Section 13.3.3 (Relationships)
 */

import { THEME_TEST_DATA } from "../fixtures/theme-test-data";

describe("Theme Hierarchy", () => {
  /**
   * Verify that each slide uses the correct theme based on its master.
   *
   * Per ECMA-376 Part 1, Section 13.3.3 (Relationships):
   * Slide → SlideLayout → SlideMaster → Theme
   */
  it("slide 1-3 use theme1 (via slideMaster1)", () => {
    expect(THEME_TEST_DATA.slides[0].themeRef).toBe("theme1.xml");
    expect(THEME_TEST_DATA.slides[1].themeRef).toBe("theme1.xml");
    expect(THEME_TEST_DATA.slides[2].themeRef).toBe("theme1.xml");
  });

  it("slide 4-7 use theme3 (via slideMaster3)", () => {
    expect(THEME_TEST_DATA.slides[3].themeRef).toBe("theme3.xml");
    expect(THEME_TEST_DATA.slides[4].themeRef).toBe("theme3.xml");
    expect(THEME_TEST_DATA.slides[5].themeRef).toBe("theme3.xml");
    expect(THEME_TEST_DATA.slides[6].themeRef).toBe("theme3.xml");
  });

  it("slide 8-9 use theme5 (via slideMaster5)", () => {
    expect(THEME_TEST_DATA.slides[7].themeRef).toBe("theme5.xml");
    expect(THEME_TEST_DATA.slides[8].themeRef).toBe("theme5.xml");
  });

  it("slide 10 uses theme7 (via slideMaster7)", () => {
    expect(THEME_TEST_DATA.slides[9].themeRef).toBe("theme7.xml");
  });
});

describe("Theme Test Data Integrity", () => {
  /**
   * Verify the generated test data is consistent.
   */
  it("has 7 themes", () => {
    expect(THEME_TEST_DATA.themes.length).toBe(7);
  });

  it("has 10 slides", () => {
    expect(THEME_TEST_DATA.slides.length).toBe(10);
  });

  it("all slides have valid theme references", () => {
    const themeNames = THEME_TEST_DATA.themes.map((t) => t.name);
    for (const slide of THEME_TEST_DATA.slides) {
      expect(themeNames).toContain(slide.themeRef);
    }
  });

  it("color schemes have 12 standard colors", () => {
    const standardColors = [
      "dk1",
      "lt1",
      "dk2",
      "lt2",
      "accent1",
      "accent2",
      "accent3",
      "accent4",
      "accent5",
      "accent6",
      "hlink",
      "folHlink",
    ] as const;
    for (const theme of THEME_TEST_DATA.themes) {
      for (const color of standardColors) {
        expect(theme.colorScheme[color]).toBeDefined();
      }
    }
  });
});

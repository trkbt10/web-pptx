/** @file PAP extractor tests */
import { extractPapProps } from "./pap-extractor";
import { parseGrpprl } from "../sprm/sprm-decoder";

describe("extractPapProps", () => {
  it("extracts alignment (center)", () => {
    // sprmPJc(0x2461) = 1 (center)
    const sprms = parseGrpprl(new Uint8Array([0x61, 0x24, 0x01]));
    const props = extractPapProps(sprms, 0);
    expect(props.alignment).toBe("center");
  });

  it("extracts alignment (justify)", () => {
    const sprms = parseGrpprl(new Uint8Array([0x61, 0x24, 0x03]));
    const props = extractPapProps(sprms, 0);
    expect(props.alignment).toBe("justify");
  });

  it("extracts left indent", () => {
    // sprmPDxaLeft(0x845E) = 720 twips (0.5 inch)
    const sprms = parseGrpprl(new Uint8Array([0x5e, 0x84, 0xd0, 0x02]));
    const props = extractPapProps(sprms, 0);
    expect(props.indentLeft).toBe(720);
  });

  it("extracts space before/after", () => {
    // sprmPDyaBefore(0xA413) = 240 + sprmPDyaAfter(0xA414) = 120
    const buf = new Uint8Array([
      0x13, 0xa4, 0xf0, 0x00, // spaceBefore = 240
      0x14, 0xa4, 0x78, 0x00, // spaceAfter = 120
    ]);
    const sprms = parseGrpprl(buf);
    const props = extractPapProps(sprms, 0);
    expect(props.spaceBefore).toBe(240);
    expect(props.spaceAfter).toBe(120);
  });

  it("extracts line spacing (proportional)", () => {
    // sprmPDyaLine(0x6412) = 360(dyaLine) + 1(fMult) → 1.5 line spacing
    const buf = new Uint8Array([0x12, 0x64, 0x68, 0x01, 0x01, 0x00]);
    const sprms = parseGrpprl(buf);
    const props = extractPapProps(sprms, 0);
    expect(props.lineSpacing).toEqual({ value: 360, multi: true });
  });

  it("extracts keepTogether flag", () => {
    const sprms = parseGrpprl(new Uint8Array([0x05, 0x24, 0x01]));
    const props = extractPapProps(sprms, 0);
    expect(props.keepTogether).toBe(true);
  });

  it("extracts table flags", () => {
    const buf = new Uint8Array([
      0x16, 0x24, 0x01, // inTable
      0x17, 0x24, 0x01, // isRowEnd (TTP)
    ]);
    const sprms = parseGrpprl(buf);
    const props = extractPapProps(sprms, 0);
    expect(props.inTable).toBe(true);
    expect(props.isRowEnd).toBe(true);
  });

  it("extracts list reference", () => {
    // sprmPIlfo(0x460B) = 3 + sprmPIlvl(0x260A) = 1
    const buf = new Uint8Array([
      0x0b, 0x46, 0x03, 0x00, // listIndex = 3
      0x0a, 0x26, 0x01,       // listLevel = 1
    ]);
    const sprms = parseGrpprl(buf);
    const props = extractPapProps(sprms, 0);
    expect(props.listIndex).toBe(3);
    expect(props.listLevel).toBe(1);
  });

  it("preserves istd from PAPX", () => {
    const props = extractPapProps([], 42);
    expect(props.istd).toBe(42);
  });
});

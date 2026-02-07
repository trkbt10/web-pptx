/** @file Field extractor tests */
import { extractFields, extractHyperlinks, parsePlcfFld } from "./field-extractor";

describe("extractFields", () => {
  it("extracts a HYPERLINK field", () => {
    // Instruction between cp 6..40 (begin at 5, sep at 40, end at 55)
    const instr = 'HYPERLINK "https://example.com"'; // 31 chars
    const result = "Example Link"; // 12 chars
    // Build text: [0..5=spaces][6..36=instr][37..39=spaces][40=sep][41..52=result][53..55=spaces]
    const text = " ".repeat(6) + instr + " ".repeat(4) + result + " ".repeat(10);
    const markers = [
      { cp: 5, ch: 0x13, flt: 0 },  // begin
      { cp: 40, ch: 0x14, flt: 0 }, // separator
      { cp: 55, ch: 0x15, flt: 0 }, // end
    ];

    const fields = extractFields(markers, text);
    expect(fields).toHaveLength(1);
    expect(fields[0].type).toBe("HYPERLINK");
    expect(fields[0].instruction).toContain("https://example.com");
  });

  it("handles nested fields", () => {
    const markers = [
      { cp: 0, ch: 0x13, flt: 0 },  // outer begin
      { cp: 5, ch: 0x13, flt: 0 },  // inner begin
      { cp: 10, ch: 0x15, flt: 0 }, // inner end
      { cp: 15, ch: 0x14, flt: 0 }, // outer separator
      { cp: 20, ch: 0x15, flt: 0 }, // outer end
    ];
    const text = " ".repeat(25);

    const fields = extractFields(markers, text);
    expect(fields).toHaveLength(1); // Only outer field extracted
  });
});

describe("extractHyperlinks", () => {
  it("extracts URL from HYPERLINK field", () => {
    const fields = [
      { type: "HYPERLINK", instruction: 'HYPERLINK "https://example.com"', result: "Click here", cpStart: 0, cpEnd: 50 },
    ];
    const links = extractHyperlinks(fields);
    expect(links).toHaveLength(1);
    expect(links[0].url).toBe("https://example.com");
    expect(links[0].displayText).toBe("Click here");
  });

  it("extracts anchor from HYPERLINK field", () => {
    const fields = [
      { type: "HYPERLINK", instruction: 'HYPERLINK "doc.html" \\l "section1"', result: "Sec 1", cpStart: 0, cpEnd: 50 },
    ];
    const links = extractHyperlinks(fields);
    expect(links).toHaveLength(1);
    expect(links[0].url).toBe("doc.html");
    expect(links[0].anchor).toBe("section1");
  });

  it("ignores non-HYPERLINK fields", () => {
    const fields = [
      { type: "PAGE", instruction: "PAGE", result: "1", cpStart: 0, cpEnd: 10 },
    ];
    const links = extractHyperlinks(fields);
    expect(links).toHaveLength(0);
  });
});

describe("parsePlcfFld", () => {
  it("returns empty for lcb=0", () => {
    expect(parsePlcfFld(new Uint8Array(10), 0, 0)).toEqual([]);
  });

  it("parses field markers", () => {
    // 1 field marker: 2 CPs (8B) + 1 Fld (2B) = 10
    const data = new Uint8Array(12);
    const view = new DataView(data.buffer);
    view.setInt32(0, 5, true);  // cp[0]
    view.setInt32(4, 10, true); // cp[1]
    data[8] = 0x13;  // ch = field begin
    data[9] = 0x58;  // flt = HYPERLINK

    const markers = parsePlcfFld(data, 0, 10);
    expect(markers).toHaveLength(1);
    expect(markers[0].cp).toBe(5);
    expect(markers[0].ch).toBe(0x13);
  });
});

/** @file Converter tests */
import { convertDocToDocx } from "./index";
import type { DocDocument, DocTable, DocParagraph } from "../domain/types";

describe("convertDocToDocx", () => {
  it("converts empty document", () => {
    const doc: DocDocument = { paragraphs: [] };
    const result = convertDocToDocx(doc);

    expect(result.body.content).toEqual([]);
  });

  it("converts plain text paragraphs", () => {
    const doc: DocDocument = {
      paragraphs: [
        { runs: [{ text: "Hello" }] },
        { runs: [{ text: "World" }] },
      ],
    };

    const result = convertDocToDocx(doc);

    expect(result.body.content).toHaveLength(2);
    expect(result.body.content[0]).toMatchObject({
      type: "paragraph",
      content: [{ type: "run", content: [{ type: "text", value: "Hello" }] }],
    });
  });

  it("maps justify alignment to both", () => {
    const doc: DocDocument = {
      paragraphs: [
        { runs: [{ text: "Justified" }], alignment: "justify" },
      ],
    };

    const result = convertDocToDocx(doc);

    expect(result.body.content[0]).toMatchObject({
      type: "paragraph",
      properties: { jc: "both" },
    });
  });

  it("maps center alignment", () => {
    const doc: DocDocument = {
      paragraphs: [
        { runs: [{ text: "Centered" }], alignment: "center" },
      ],
    };

    const result = convertDocToDocx(doc);

    expect(result.body.content[0]).toMatchObject({
      type: "paragraph",
      properties: { jc: "center" },
    });
  });

  it("converts run properties (bold, italic, fontSize)", () => {
    const doc: DocDocument = {
      paragraphs: [
        {
          runs: [
            {
              text: "Styled",
              bold: true,
              italic: true,
              fontSize: 14,
              fontName: "Arial",
              color: "FF0000",
            },
          ],
        },
      ],
    };

    const result = convertDocToDocx(doc);

    expect(result.body.content[0]).toMatchObject({
      type: "paragraph",
      content: [{
        type: "run",
        properties: {
          b: true,
          i: true,
          sz: 28, // 14pt → 28 half-points
          rFonts: { ascii: "Arial" },
        },
      }],
    });
  });
});

describe("convertDocToDocx — table conversion", () => {
  it("converts a simple 2x2 table", () => {
    const table: DocTable = {
      rows: [
        { cells: [{ paragraphs: [{ runs: [{ text: "A1" }] }] }, { paragraphs: [{ runs: [{ text: "B1" }] }] }] },
        { cells: [{ paragraphs: [{ runs: [{ text: "A2" }] }] }, { paragraphs: [{ runs: [{ text: "B2" }] }] }] },
      ],
    };
    const doc: DocDocument = {
      paragraphs: [],
      content: [table],
    };

    const result = convertDocToDocx(doc);

    expect(result.body.content).toHaveLength(1);
    expect(result.body.content[0]).toMatchObject({
      type: "table",
      rows: [
        { type: "tableRow", cells: [{ type: "tableCell" }, { type: "tableCell" }] },
        { type: "tableRow", cells: [{ type: "tableCell" }, { type: "tableCell" }] },
      ],
    });
  });

  it("converts cell widths to tcW", () => {
    const table: DocTable = {
      rows: [
        { cells: [{ paragraphs: [{ runs: [{ text: "A" }] }], width: 3000 }] },
      ],
    };
    const doc: DocDocument = { paragraphs: [], content: [table] };

    const result = convertDocToDocx(doc);

    const row = result.body.content[0];
    expect(row).toMatchObject({
      type: "table",
      rows: [{
        cells: [{
          type: "tableCell",
          properties: { tcW: { value: 3000, type: "dxa" } },
        }],
      }],
    });
  });

  it("converts row height to trHeight", () => {
    const table: DocTable = {
      rows: [
        { cells: [{ paragraphs: [{ runs: [{ text: "A" }] }] }], height: 480 },
      ],
    };
    const doc: DocDocument = { paragraphs: [], content: [table] };

    const result = convertDocToDocx(doc);

    expect(result.body.content[0]).toMatchObject({
      type: "table",
      rows: [{
        type: "tableRow",
        properties: { trHeight: { val: 480, hRule: "atLeast" } },
      }],
    });
  });

  it("converts header row flag", () => {
    const table: DocTable = {
      rows: [
        { cells: [{ paragraphs: [{ runs: [{ text: "Header" }] }] }], header: true },
        { cells: [{ paragraphs: [{ runs: [{ text: "Data" }] }] }] },
      ],
    };
    const doc: DocDocument = { paragraphs: [], content: [table] };

    const result = convertDocToDocx(doc);

    expect(result.body.content[0]).toMatchObject({
      type: "table",
      rows: [
        { properties: { tblHeader: true } },
        { type: "tableRow" },
      ],
    });
  });

  it("converts cell vertical merge", () => {
    const table: DocTable = {
      rows: [
        { cells: [{ paragraphs: [{ runs: [{ text: "Span start" }] }], verticalMerge: "restart" }] },
        { cells: [{ paragraphs: [{ runs: [{ text: "" }] }], verticalMerge: "continue" }] },
      ],
    };
    const doc: DocDocument = { paragraphs: [], content: [table] };

    const result = convertDocToDocx(doc);

    expect(result.body.content[0]).toMatchObject({
      type: "table",
      rows: [
        { cells: [{ properties: { vMerge: "restart" } }] },
        { cells: [{ properties: { vMerge: "continue" } }] },
      ],
    });
  });

  it("converts cell vertical alignment", () => {
    const table: DocTable = {
      rows: [
        { cells: [{ paragraphs: [{ runs: [{ text: "Center" }] }], verticalAlign: "center" }] },
      ],
    };
    const doc: DocDocument = { paragraphs: [], content: [table] };

    const result = convertDocToDocx(doc);

    expect(result.body.content[0]).toMatchObject({
      type: "table",
      rows: [{
        cells: [{ properties: { vAlign: "center" } }],
      }],
    });
  });
});

describe("convertDocToDocx — section conversion", () => {
  it("attaches section properties to last paragraph", () => {
    const doc: DocDocument = {
      paragraphs: [
        { runs: [{ text: "Content" }] },
      ],
      sections: [{
        pageWidth: 12240,
        pageHeight: 15840,
        paragraphs: [{ runs: [{ text: "Content" }] }],
      }],
    };

    const result = convertDocToDocx(doc);

    expect(result.body.content[0]).toMatchObject({
      type: "paragraph",
      properties: {
        sectPr: {
          pgSz: { w: 12240, h: 15840 },
        },
      },
    });
  });

  it("converts page margins", () => {
    const doc: DocDocument = {
      paragraphs: [{ runs: [{ text: "X" }] }],
      sections: [{
        marginTop: 1440,
        marginBottom: 1440,
        marginLeft: 1800,
        marginRight: 1800,
        paragraphs: [{ runs: [{ text: "X" }] }],
      }],
    };

    const result = convertDocToDocx(doc);

    expect(result.body.content[0]).toMatchObject({
      type: "paragraph",
      properties: {
        sectPr: {
          pgMar: { top: 1440, bottom: 1440, left: 1800, right: 1800 },
        },
      },
    });
  });

  it("converts section break type", () => {
    const doc: DocDocument = {
      paragraphs: [{ runs: [{ text: "X" }] }],
      sections: [{
        breakType: "continuous",
        paragraphs: [{ runs: [{ text: "X" }] }],
      }],
    };

    const result = convertDocToDocx(doc);

    expect(result.body.content[0]).toMatchObject({
      type: "paragraph",
      properties: {
        sectPr: { type: "continuous" },
      },
    });
  });

  it("converts columns", () => {
    const doc: DocDocument = {
      paragraphs: [{ runs: [{ text: "X" }] }],
      sections: [{
        columns: 3,
        columnSpacing: 720,
        paragraphs: [{ runs: [{ text: "X" }] }],
      }],
    };

    const result = convertDocToDocx(doc);

    expect(result.body.content[0]).toMatchObject({
      type: "paragraph",
      properties: {
        sectPr: { cols: { num: 3, space: 720 } },
      },
    });
  });

  it("converts landscape orientation", () => {
    const doc: DocDocument = {
      paragraphs: [{ runs: [{ text: "X" }] }],
      sections: [{
        pageWidth: 15840,
        pageHeight: 12240,
        orientation: "landscape",
        paragraphs: [{ runs: [{ text: "X" }] }],
      }],
    };

    const result = convertDocToDocx(doc);

    expect(result.body.content[0]).toMatchObject({
      type: "paragraph",
      properties: {
        sectPr: { pgSz: { w: 15840, h: 12240, orient: "landscape" } },
      },
    });
  });
});

describe("convertDocToDocx — mixed content", () => {
  it("converts mixed paragraphs and tables from content field", () => {
    const para1: DocParagraph = { runs: [{ text: "Before table" }] };
    const table: DocTable = {
      rows: [
        { cells: [{ paragraphs: [{ runs: [{ text: "Cell" }] }] }] },
      ],
    };
    const para2: DocParagraph = { runs: [{ text: "After table" }] };

    const doc: DocDocument = {
      paragraphs: [para1, para2],
      content: [para1, table, para2],
    };

    const result = convertDocToDocx(doc);

    expect(result.body.content).toHaveLength(3);
    expect(result.body.content[0]).toMatchObject({ type: "paragraph" });
    expect(result.body.content[1]).toMatchObject({ type: "table" });
    expect(result.body.content[2]).toMatchObject({ type: "paragraph" });
  });

  it("falls back to paragraphs when content is undefined", () => {
    const doc: DocDocument = {
      paragraphs: [
        { runs: [{ text: "Hello" }] },
        { runs: [{ text: "World" }] },
      ],
    };

    const result = convertDocToDocx(doc);

    expect(result.body.content).toHaveLength(2);
    expect(result.body.content[0]).toMatchObject({ type: "paragraph" });
    expect(result.body.content[1]).toMatchObject({ type: "paragraph" });
  });

  it("converts table with all properties in mixed content", () => {
    const table: DocTable = {
      rows: [
        {
          cells: [
            { paragraphs: [{ runs: [{ text: "H1" }] }], width: 4000 },
            { paragraphs: [{ runs: [{ text: "H2" }] }], width: 4000 },
          ],
          height: 360,
          header: true,
        },
        {
          cells: [
            { paragraphs: [{ runs: [{ text: "D1" }] }], width: 4000 },
            { paragraphs: [{ runs: [{ text: "D2" }] }], width: 4000 },
          ],
          height: 240,
        },
      ],
    };

    const doc: DocDocument = {
      paragraphs: [],
      content: [{ runs: [{ text: "Title" }] }, table],
    };

    const result = convertDocToDocx(doc);

    expect(result.body.content).toHaveLength(2);
    expect(result.body.content[0]).toMatchObject({ type: "paragraph" });
    expect(result.body.content[1]).toMatchObject({
      type: "table",
      rows: [
        {
          properties: { trHeight: { val: 360 }, tblHeader: true },
          cells: [
            { properties: { tcW: { value: 4000, type: "dxa" } } },
            { properties: { tcW: { value: 4000, type: "dxa" } } },
          ],
        },
        {
          properties: { trHeight: { val: 240 } },
          cells: [
            { properties: { tcW: { value: 4000, type: "dxa" } } },
            { properties: { tcW: { value: 4000, type: "dxa" } } },
          ],
        },
      ],
    });
  });
});

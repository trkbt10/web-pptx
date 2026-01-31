/**
 * @file Table update builder tests
 */

import { parseXml, serializeDocument, getByPath, getChildren } from "@oxen/xml";
import { applyTableUpdates } from "./table-update-builder";

const createSlideWithTable = (tableXml: string) => `
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr/>
      <p:graphicFrame>
        <p:nvGraphicFramePr>
          <p:cNvPr id="4" name="Table"/>
          <p:cNvGraphicFramePr/>
          <p:nvPr/>
        </p:nvGraphicFramePr>
        <p:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="1000000" cy="500000"/>
        </p:xfrm>
        <a:graphic>
          <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table">
            ${tableXml}
          </a:graphicData>
        </a:graphic>
      </p:graphicFrame>
    </p:spTree>
  </p:cSld>
</p:sld>
`;

const simpleTableXml = `
<a:tbl>
  <a:tblPr firstRow="1" bandRow="1"/>
  <a:tblGrid>
    <a:gridCol w="500000"/>
    <a:gridCol w="500000"/>
  </a:tblGrid>
  <a:tr h="370840">
    <a:tc>
      <a:txBody><a:bodyPr/><a:lstStyle/><a:p></a:p></a:txBody>
      <a:tcPr/>
    </a:tc>
    <a:tc>
      <a:txBody><a:bodyPr/><a:lstStyle/><a:p></a:p></a:txBody>
      <a:tcPr/>
    </a:tc>
  </a:tr>
  <a:tr h="370840">
    <a:tc>
      <a:txBody><a:bodyPr/><a:lstStyle/><a:p></a:p></a:txBody>
      <a:tcPr/>
    </a:tc>
    <a:tc>
      <a:txBody><a:bodyPr/><a:lstStyle/><a:p></a:p></a:txBody>
      <a:tcPr/>
    </a:tc>
  </a:tr>
</a:tbl>
`;

describe("applyTableUpdates", () => {
  it("updates cell content with simple text", () => {
    const slideXml = createSlideWithTable(simpleTableXml);
    const slideDoc = parseXml(slideXml);

    const result = applyTableUpdates(slideDoc, [
      {
        shapeId: "4",
        updateCells: [
          { row: 0, col: 0, content: "Hello World" },
        ],
      },
    ]);

    expect(result.updated).toBe(1);

    const xml = serializeDocument(result.doc);
    expect(xml).toContain("Hello World");
  });

  it("updates cell content with rich text", () => {
    const slideXml = createSlideWithTable(simpleTableXml);
    const slideDoc = parseXml(slideXml);

    const result = applyTableUpdates(slideDoc, [
      {
        shapeId: "4",
        updateCells: [
          {
            row: 0,
            col: 1,
            content: {
              paragraphs: [
                {
                  runs: [
                    { text: "Bold", bold: true },
                    { text: " text" },
                  ],
                },
              ],
            },
          },
        ],
      },
    ]);

    expect(result.updated).toBe(1);

    const xml = serializeDocument(result.doc);
    expect(xml).toContain("Bold");
    expect(xml).toContain("text");
  });

  it("adds a row to the table", () => {
    const slideXml = createSlideWithTable(simpleTableXml);
    const slideDoc = parseXml(slideXml);

    const result = applyTableUpdates(slideDoc, [
      {
        shapeId: "4",
        addRows: [
          { height: 50, cells: ["New A", "New B"] },
        ],
      },
    ]);

    expect(result.updated).toBe(1);

    // Check that there are now 3 rows
    const table = getByPath(result.doc, [
      "p:sld", "p:cSld", "p:spTree", "p:graphicFrame",
      "a:graphic", "a:graphicData", "a:tbl",
    ]);
    expect(table).toBeDefined();
    const rows = getChildren(table!, "a:tr");
    expect(rows.length).toBe(3);
  });

  it("returns unchanged doc when shapeId not found", () => {
    const slideXml = createSlideWithTable(simpleTableXml);
    const slideDoc = parseXml(slideXml);

    const result = applyTableUpdates(slideDoc, [
      {
        shapeId: "999",
        updateCells: [
          { row: 0, col: 0, content: "Should not appear" },
        ],
      },
    ]);

    expect(result.updated).toBe(0);

    const xml = serializeDocument(result.doc);
    expect(xml).not.toContain("Should not appear");
  });

  it("returns original doc when updates array is empty", () => {
    const slideXml = createSlideWithTable(simpleTableXml);
    const slideDoc = parseXml(slideXml);

    const result = applyTableUpdates(slideDoc, []);

    expect(result.updated).toBe(0);
    expect(result.doc).toBe(slideDoc);
  });
});

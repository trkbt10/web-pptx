/**
 * @file Animation builder tests
 */

import { parseXml, serializeDocument } from "@oxen/xml";
import { applyAnimations } from "./animation-builder";

const createSlideXml = () => `
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
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Title"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr/>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>
`;

describe("applyAnimations", () => {
  it("returns unchanged doc when animations array is empty", () => {
    const slideXml = createSlideXml();
    const slideDoc = parseXml(slideXml);

    const result = applyAnimations(slideDoc, []);

    expect(result.added).toBe(0);
    expect(result.doc).toBe(slideDoc);
  });

  it("adds timing element to slide for entrance animation", () => {
    const slideXml = createSlideXml();
    const slideDoc = parseXml(slideXml);

    const result = applyAnimations(slideDoc, [
      {
        shapeId: "2",
        class: "entrance",
        effect: "fade",
        duration: 500,
      },
    ]);

    expect(result.added).toBe(1);

    const xml = serializeDocument(result.doc);
    expect(xml).toContain("<p:timing");
    expect(xml).toContain("<p:tnLst");
  });

  it("adds timing element with trigger for onClick animation", () => {
    const slideXml = createSlideXml();
    const slideDoc = parseXml(slideXml);

    const result = applyAnimations(slideDoc, [
      {
        shapeId: "2",
        class: "entrance",
        effect: "fly",
        trigger: "onClick",
        duration: 1000,
        direction: "bottom",
      },
    ]);

    expect(result.added).toBe(1);

    const xml = serializeDocument(result.doc);
    expect(xml).toContain("<p:timing");
  });

  it("adds multiple animations", () => {
    const slideXml = createSlideXml();
    const slideDoc = parseXml(slideXml);

    const result = applyAnimations(slideDoc, [
      {
        shapeId: "2",
        class: "entrance",
        effect: "fade",
        trigger: "onClick",
      },
      {
        shapeId: "2",
        class: "emphasis",
        effect: "pulse",
        trigger: "afterPrevious",
      },
    ]);

    expect(result.added).toBe(2);

    const xml = serializeDocument(result.doc);
    expect(xml).toContain("<p:timing");
  });
});

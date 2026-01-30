/**
 * @file Tests for chart-add-builder
 */

import { getByPath, getChild, getTextByPath, isXmlElement, parseXml, type XmlElement } from "@oxen/xml";
import { addChartsToSlide } from "./chart-add-builder";
import type { ZipPackage } from "@oxen/zip";

describe("chart-add-builder", () => {
  const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:spTree/>
  </p:cSld>
</p:sld>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
</Types>`;

  function createZipPackageStub(options: {
    readonly files: Map<string, string>;
    readonly written: Map<string, string>;
  }): ZipPackage {
    return {
      readText: (path) => options.written.get(path) ?? options.files.get(path) ?? null,
      readBinary: (_path) => null,
      exists: (path) => options.written.has(path) || options.files.has(path),
      listFiles: () => [...new Set([...options.files.keys(), ...options.written.keys()])],
      writeText: (path, content) => {
        options.written.set(path, content);
      },
      writeBinary: (_path, _content) => {},
      remove: (_path) => {},
      toBlob: async () => {
        throw new Error("zipPackage stub: toBlob is not implemented");
      },
      toArrayBuffer: async () => {
        throw new Error("zipPackage stub: toArrayBuffer is not implemented");
      },
      asPresentationFile: () => ({
        readText: (path) => options.written.get(path) ?? options.files.get(path) ?? null,
        readBinary: (_path) => null,
        exists: (path) => options.written.has(path) || options.files.has(path),
        listFiles: () => [...new Set([...options.files.keys(), ...options.written.keys()])],
      }),
    };
  }

  it("creates chart part + rels + content types and inserts p:graphicFrame", () => {
    const files = new Map<string, string>([["[Content_Types].xml", contentTypesXml]]);
    const written = new Map<string, string>();
    const zipPackage = createZipPackageStub({ files, written });

    const doc = parseXml(slideXml);
    const result = addChartsToSlide({
      slideDoc: doc,
      specs: [
        {
          chartType: "lineChart",
          x: 10,
          y: 20,
          width: 300,
          height: 200,
          title: "My Chart",
          data: { categories: ["A", "B"], series: [{ name: "S1", values: [1, 2] }] },
        },
      ],
      ctx: { zipPackage, slidePath: "ppt/slides/slide1.xml", existingIds: [] },
    });

    // Chart part written
    const chartXml = written.get("ppt/charts/chart1.xml");
    expect(chartXml).toBeDefined();

    const chartDoc = parseXml(chartXml!);
    const lineChart = getByPath(chartDoc, ["c:chartSpace", "c:chart", "c:plotArea", "c:lineChart"]);
    expect(lineChart).toBeDefined();

    const cat0 = getTextByPath(chartDoc, ["c:chartSpace", "c:chart", "c:plotArea", "c:lineChart", "c:ser", "c:cat", "c:strLit", "c:pt", "c:v"]);
    expect(cat0).toBe("A");

    const titleText = getTextByPath(chartDoc, ["c:chartSpace", "c:chart", "c:title", "c:tx", "c:rich", "a:p", "a:r", "a:t"]);
    expect(titleText).toBe("My Chart");

    // Slide rels written
    const relsXml = written.get("ppt/slides/_rels/slide1.xml.rels");
    expect(relsXml).toBeDefined();
    expect(relsXml).toContain("relationships/chart");

    // Content types override added
    const ctXml = written.get("[Content_Types].xml");
    expect(ctXml).toBeDefined();
    expect(ctXml).toContain("/ppt/charts/chart1.xml");

    // Slide doc includes a graphicFrame with c:chart r:id
    const spTree = getByPath(result.doc, ["p:sld", "p:cSld", "p:spTree"]) as XmlElement | undefined;
    if (!spTree || !isXmlElement(spTree)) {
      throw new Error("test: missing p:spTree");
    }
    const frames = spTree.children.filter((c): c is XmlElement => isXmlElement(c) && c.name === "p:graphicFrame");
    expect(frames).toHaveLength(1);

    const chart = getByPath(frames[0]!, ["a:graphic", "a:graphicData", "c:chart"]) as XmlElement | undefined;
    expect(chart?.attrs["r:id"]).toBeDefined();

    // xfrm should be patched (off/ext present)
    const xfrm = getChild(frames[0]!, "p:xfrm") as XmlElement | undefined;
    const off = xfrm ? (getChild(xfrm, "a:off") as XmlElement | undefined) : undefined;
    const ext = xfrm ? (getChild(xfrm, "a:ext") as XmlElement | undefined) : undefined;
    expect(off?.attrs.x).toBeDefined();
    expect(off?.attrs.y).toBeDefined();
    expect(ext?.attrs.cx).toBeDefined();
    expect(ext?.attrs.cy).toBeDefined();
  });
});

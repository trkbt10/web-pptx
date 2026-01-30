/**
 * @file Tests for chart-builder
 */

import { getByPath, getChild, getTextByPath, parseXml, type XmlElement } from "@oxen/xml";
import { applyChartUpdates } from "./chart-builder";
import type { ZipPackage } from "@oxen/zip";

describe("chart-builder", () => {
  const graphicFrameXml = `<p:graphicFrame>
  <p:nvGraphicFramePr>
    <p:cNvPr id="4" name="Chart 1"/>
    <p:cNvGraphicFramePr/>
    <p:nvPr/>
  </p:nvGraphicFramePr>
  <p:xfrm>
    <a:off x="0" y="0"/>
    <a:ext cx="100" cy="200"/>
  </p:xfrm>
  <a:graphic>
    <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">
      <c:chart r:id="rId2"/>
    </a:graphicData>
  </a:graphic>
</p:graphicFrame>`;

  const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:spTree>
      ${graphicFrameXml}
    </p:spTree>
  </p:cSld>
</p:sld>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart1.xml"/>
</Relationships>`;

  const chartXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <c:chart>
    <c:plotArea>
      <c:lineChart/>
    </c:plotArea>
  </c:chart>
</c:chartSpace>`;

  function createZipPackageStub(options: {
    readonly files: ReadonlyMap<string, string>;
    readonly written: Map<string, string>;
  }): ZipPackage {
    return {
      readText: (path) => options.files.get(path) ?? null,
      readBinary: (_path) => null,
      exists: (path) => options.files.has(path) || options.written.has(path),
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
        readText: (path) => options.files.get(path) ?? options.written.get(path) ?? null,
        readBinary: (_path) => null,
        exists: (path) => options.files.has(path) || options.written.has(path),
        listFiles: () => [...new Set([...options.files.keys(), ...options.written.keys()])],
      }),
    };
  }

  it("patches slide graphicFrame title and chart part title", () => {
    const written = new Map<string, string>();
    const files = new Map<string, string>([
      ["ppt/slides/_rels/slide1.xml.rels", relsXml],
      ["ppt/charts/chart1.xml", chartXml],
    ]);

    const zipPackage = createZipPackageStub({ files, written });

    const doc = parseXml(slideXml);
    const result = applyChartUpdates(
      doc,
      { zipPackage, slidePath: "ppt/slides/slide1.xml" },
      [{ resourceId: "rId2", title: "New Title" }],
    );

    const spTree = getByPath(result.doc, ["p:sld", "p:cSld", "p:spTree"]) as XmlElement | undefined;
    const frame = spTree?.children.find((c) => (c as XmlElement)?.name === "p:graphicFrame") as XmlElement | undefined;
    const cNvPr = frame ? (getByPath(frame, ["p:nvGraphicFramePr", "p:cNvPr"]) as XmlElement | undefined) : undefined;
    expect(cNvPr?.attrs.name).toBe("New Title");

    const updatedChartXml = written.get("ppt/charts/chart1.xml");
    expect(updatedChartXml).toBeDefined();

    const chartDoc = parseXml(updatedChartXml!);
    const titleText = getTextByPath(chartDoc, [
      "c:chartSpace",
      "c:chart",
      "c:title",
      "c:tx",
      "c:rich",
      "a:p",
      "a:r",
      "a:t",
    ]);
    expect(titleText).toBe("New Title");
  });

  it("patches chart transform when provided", () => {
    const written = new Map<string, string>();
    const files = new Map<string, string>([
      ["ppt/slides/_rels/slide1.xml.rels", relsXml],
      ["ppt/charts/chart1.xml", chartXml],
    ]);

    const zipPackage = createZipPackageStub({ files, written });

    const doc = parseXml(slideXml);
    const result = applyChartUpdates(
      doc,
      { zipPackage, slidePath: "ppt/slides/slide1.xml" },
      [{ resourceId: "rId2", transform: { x: 10, y: 20, width: 30, height: 40 } }],
    );

    const frame = getByPath(result.doc, ["p:sld", "p:cSld", "p:spTree", "p:graphicFrame"]) as XmlElement | undefined;
    const xfrm = frame ? (getChild(frame, "p:xfrm") as XmlElement | undefined) : undefined;
    const off = xfrm ? (getChild(xfrm, "a:off") as XmlElement | undefined) : undefined;
    const ext = xfrm ? (getChild(xfrm, "a:ext") as XmlElement | undefined) : undefined;

    expect(off?.attrs.x).toBeDefined();
    expect(off?.attrs.y).toBeDefined();
    expect(ext?.attrs.cx).toBeDefined();
    expect(ext?.attrs.cy).toBeDefined();
  });
});

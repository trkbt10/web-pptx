/**
 * @file Unit tests for presentation.ts
 */

import { openPresentation } from "./presentation";
import type { PresentationFile } from "./types/file";

/**
 * Create a fake PresentationFile for testing
 */
function createFakePresentationFile(
  files: Record<string, string | ArrayBuffer>,
): PresentationFile {
  return {
    readText(path: string): string | null {
      const content = files[path];
      if (content === undefined) {
        return null;
      }
      if (typeof content === "string") {
        return content;
      }
      return null;
    },
    readBinary(path: string): ArrayBuffer | null {
      const content = files[path];
      if (content === undefined) {
        return null;
      }
      if (content instanceof ArrayBuffer) {
        return content;
      }
      return null;
    },
    exists(path: string): boolean {
      return path in files;
    },
  };
}

/**
 * Minimal content types XML for testing
 */
const MINIMAL_CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/slides/slide2.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
</Types>`;

/**
 * Minimal presentation XML for testing
 */
const MINIMAL_PRESENTATION = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldSz cx="9144000" cy="6858000"/>
  <p:defaultTextStyle>
    <a:defPPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
      <a:defRPr sz="1800"/>
    </a:defPPr>
  </p:defaultTextStyle>
</p:presentation>`;

/**
 * Minimal slide XML for testing
 */
const MINIMAL_SLIDE = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr/>
    </p:spTree>
  </p:cSld>
</p:sld>`;

/**
 * Minimal slide relationships XML for testing
 */
const MINIMAL_SLIDE_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`;

/**
 * Minimal slide layout XML for testing
 */
const MINIMAL_LAYOUT = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr/>
    </p:spTree>
  </p:cSld>
</p:sldLayout>`;

/**
 * Minimal layout relationships XML for testing
 */
const MINIMAL_LAYOUT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`;

/**
 * Minimal slide master XML for testing
 */
const MINIMAL_MASTER = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr/>
    </p:spTree>
  </p:cSld>
  <p:txStyles>
    <p:titleStyle/>
    <p:bodyStyle/>
  </p:txStyles>
</p:sldMaster>`;

/**
 * Minimal master relationships XML for testing
 */
const MINIMAL_MASTER_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`;

/**
 * Minimal theme XML for testing
 */
const MINIMAL_THEME = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Test Theme">
  <a:themeElements>
    <a:clrScheme name="Test">
      <a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>
      <a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="44546A"/></a:dk2>
      <a:lt2><a:srgbClr val="E7E6E6"/></a:lt2>
      <a:accent1><a:srgbClr val="5B9BD5"/></a:accent1>
      <a:accent2><a:srgbClr val="ED7D31"/></a:accent2>
      <a:accent3><a:srgbClr val="A5A5A5"/></a:accent3>
      <a:accent4><a:srgbClr val="FFC000"/></a:accent4>
      <a:accent5><a:srgbClr val="4472C4"/></a:accent5>
      <a:accent6><a:srgbClr val="70AD47"/></a:accent6>
      <a:hlink><a:srgbClr val="0563C1"/></a:hlink>
      <a:folHlink><a:srgbClr val="954F72"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="Test">
      <a:majorFont><a:latin typeface="Calibri"/></a:majorFont>
      <a:minorFont><a:latin typeface="Calibri"/></a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="Test">
      <a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>
      <a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>
      <a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>
      <a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
</a:theme>`;

/**
 * App XML with version for testing
 */
const APP_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <AppVersion>16.0</AppVersion>
</Properties>`;

/**
 * Create a minimal fake presentation file for testing
 */
function createMinimalFakePresentationFile(): PresentationFile {
  return createFakePresentationFile({
    "[Content_Types].xml": MINIMAL_CONTENT_TYPES,
    "ppt/presentation.xml": MINIMAL_PRESENTATION,
    "ppt/slides/slide1.xml": MINIMAL_SLIDE,
    "ppt/slides/slide2.xml": MINIMAL_SLIDE,
    "ppt/slides/_rels/slide1.xml.rels": MINIMAL_SLIDE_RELS,
    "ppt/slides/_rels/slide2.xml.rels": MINIMAL_SLIDE_RELS,
    "ppt/slideLayouts/slideLayout1.xml": MINIMAL_LAYOUT,
    "ppt/slideLayouts/_rels/slideLayout1.xml.rels": MINIMAL_LAYOUT_RELS,
    "ppt/slideMasters/slideMaster1.xml": MINIMAL_MASTER,
    "ppt/slideMasters/_rels/slideMaster1.xml.rels": MINIMAL_MASTER_RELS,
    "ppt/theme/theme1.xml": MINIMAL_THEME,
    "docProps/app.xml": APP_XML,
  });
}

describe("openPresentation", () => {
  describe("basic properties", () => {
    it("should return correct slide count", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      expect(presentation.count).toBe(2);
    });

    it("should return correct slide size", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      // 9144000 EMU * (1/914400) = 10 pixels (with SLIDE_FACTOR)
      // Using the formula: (cx * SLIDE_FACTOR) | 0
      expect(presentation.size.width).toBeGreaterThan(0);
      expect(presentation.size.height).toBeGreaterThan(0);
    });

    it("should return app version", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      expect(presentation.appVersion).toBe(16);
    });

    it("should return null app version when app.xml is missing", () => {
      const file = createFakePresentationFile({
        "[Content_Types].xml": MINIMAL_CONTENT_TYPES,
        "ppt/presentation.xml": MINIMAL_PRESENTATION,
        "ppt/slides/slide1.xml": MINIMAL_SLIDE,
        "ppt/slides/slide2.xml": MINIMAL_SLIDE,
        "ppt/slides/_rels/slide1.xml.rels": MINIMAL_SLIDE_RELS,
        "ppt/slides/_rels/slide2.xml.rels": MINIMAL_SLIDE_RELS,
        "ppt/slideLayouts/slideLayout1.xml": MINIMAL_LAYOUT,
        "ppt/slideLayouts/_rels/slideLayout1.xml.rels": MINIMAL_LAYOUT_RELS,
        "ppt/slideMasters/slideMaster1.xml": MINIMAL_MASTER,
        "ppt/slideMasters/_rels/slideMaster1.xml.rels": MINIMAL_MASTER_RELS,
        "ppt/theme/theme1.xml": MINIMAL_THEME,
      });
      const presentation = openPresentation(file);
      expect(presentation.appVersion).toBeNull();
    });

    it("should return null thumbnail when not present", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      expect(presentation.thumbnail).toBeNull();
    });

    it("should return thumbnail when present", () => {
      const thumbnailData = new ArrayBuffer(100);
      const file = createFakePresentationFile({
        "[Content_Types].xml": MINIMAL_CONTENT_TYPES,
        "ppt/presentation.xml": MINIMAL_PRESENTATION,
        "ppt/slides/slide1.xml": MINIMAL_SLIDE,
        "ppt/slides/slide2.xml": MINIMAL_SLIDE,
        "ppt/slides/_rels/slide1.xml.rels": MINIMAL_SLIDE_RELS,
        "ppt/slides/_rels/slide2.xml.rels": MINIMAL_SLIDE_RELS,
        "ppt/slideLayouts/slideLayout1.xml": MINIMAL_LAYOUT,
        "ppt/slideLayouts/_rels/slideLayout1.xml.rels": MINIMAL_LAYOUT_RELS,
        "ppt/slideMasters/slideMaster1.xml": MINIMAL_MASTER,
        "ppt/slideMasters/_rels/slideMaster1.xml.rels": MINIMAL_MASTER_RELS,
        "ppt/theme/theme1.xml": MINIMAL_THEME,
        "docProps/app.xml": APP_XML,
        "docProps/thumbnail.jpeg": thumbnailData,
      });
      const presentation = openPresentation(file);
      expect(presentation.thumbnail).toBe(thumbnailData);
    });

    it("should return default text style when present", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      expect(presentation.defaultTextStyle).not.toBeNull();
    });
  });

  describe("list method", () => {
    it("should list all slides without options", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      const slides = presentation.list();
      expect(slides.length).toBe(2);
      expect(slides[0].number).toBe(1);
      expect(slides[0].filename).toBe("slide1");
      expect(slides[1].number).toBe(2);
      expect(slides[1].filename).toBe("slide2");
    });

    it("should respect offset option", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      const slides = presentation.list({ offset: 1 });
      expect(slides.length).toBe(1);
      expect(slides[0].number).toBe(2);
    });

    it("should respect limit option", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      const slides = presentation.list({ limit: 1 });
      expect(slides.length).toBe(1);
      expect(slides[0].number).toBe(1);
    });

    it("should respect both offset and limit options", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      const slides = presentation.list({ offset: 0, limit: 1 });
      expect(slides.length).toBe(1);
      expect(slides[0].number).toBe(1);
    });
  });

  describe("getSlide method", () => {
    it("should return slide by number", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      const slide = presentation.getSlide(1);
      expect(slide.number).toBe(1);
      expect(slide.filename).toBe("slide1");
    });

    it("should throw for non-existent slide number", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      expect(() => presentation.getSlide(99)).toThrow("Slide 99 not found");
    });

    it("should return slide with content", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      const slide = presentation.getSlide(1);
      expect(slide.content).not.toBeNull();
    });

    it("should return slide with layout", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      const slide = presentation.getSlide(1);
      expect(slide.layout).not.toBeNull();
    });

    it("should return slide with master", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      const slide = presentation.getSlide(1);
      expect(slide.master).not.toBeNull();
    });

    it("should return slide with theme", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      const slide = presentation.getSlide(1);
      expect(slide.theme).not.toBeNull();
    });

    it("should return slide with relationships", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      const slide = presentation.getSlide(1);
      expect(slide.relationships).toBeDefined();
    });
  });

  describe("slides generator", () => {
    it("should iterate over all slides", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      const slides = [...presentation.slides()];
      expect(slides.length).toBe(2);
      expect(slides[0].number).toBe(1);
      expect(slides[1].number).toBe(2);
    });

    it("should yield slides lazily", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      const iterator = presentation.slides();
      const first = iterator.next();
      expect(first.done).toBe(false);
      expect(first.value.number).toBe(1);
    });
  });

  describe("error cases", () => {
    it("should throw when Content_Types.xml is missing", () => {
      const file = createFakePresentationFile({});
      expect(() => openPresentation(file)).toThrow("Failed to read [Content_Types].xml");
    });

    it("should throw when slide file is missing", () => {
      const file = createFakePresentationFile({
        "[Content_Types].xml": MINIMAL_CONTENT_TYPES,
        "ppt/presentation.xml": MINIMAL_PRESENTATION,
        // Missing slide files
      });
      const presentation = openPresentation(file);
      expect(() => presentation.getSlide(1)).toThrow("Failed to read slide");
    });

    it("should use default size when presentation.xml is missing", () => {
      const file = createFakePresentationFile({
        "[Content_Types].xml": MINIMAL_CONTENT_TYPES,
        "ppt/slides/slide1.xml": MINIMAL_SLIDE,
        "ppt/slides/slide2.xml": MINIMAL_SLIDE,
        "ppt/slides/_rels/slide1.xml.rels": MINIMAL_SLIDE_RELS,
        "ppt/slides/_rels/slide2.xml.rels": MINIMAL_SLIDE_RELS,
        "ppt/slideLayouts/slideLayout1.xml": MINIMAL_LAYOUT,
        "ppt/slideLayouts/_rels/slideLayout1.xml.rels": MINIMAL_LAYOUT_RELS,
        "ppt/slideMasters/slideMaster1.xml": MINIMAL_MASTER,
        "ppt/slideMasters/_rels/slideMaster1.xml.rels": MINIMAL_MASTER_RELS,
        "ppt/theme/theme1.xml": MINIMAL_THEME,
      });
      const presentation = openPresentation(file);
      expect(presentation.size.width).toBe(960);
      expect(presentation.size.height).toBe(540);
    });
  });

  describe("slide rendering", () => {
    it("should have renderHTML method", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      const slide = presentation.getSlide(1);
      expect(typeof slide.renderHTML).toBe("function");
    });

    it("should have renderSVG method", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      const slide = presentation.getSlide(1);
      expect(typeof slide.renderSVG).toBe("function");
    });

    it("should render HTML without throwing", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      const slide = presentation.getSlide(1);
      const html = slide.renderHTML();
      expect(typeof html).toBe("string");
      expect(html).toContain("<style>");
    });

    it("should render SVG without throwing", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      const slide = presentation.getSlide(1);
      const svg = slide.renderSVG();
      expect(typeof svg).toBe("string");
      expect(svg).toContain("<svg");
    });
  });
});

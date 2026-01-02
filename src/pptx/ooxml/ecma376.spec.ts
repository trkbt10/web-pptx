/**
 * @file Tests for ECMA-376 compliant type system
 */

import { type XmlElement } from "../../xml";
import {
  createElementGuard,
  getTypedChildElement,
  getTypedChildren,
  getTypedAttr,
  getNumericAttr,
  getBooleanAttr,
  isPSp,
  isPPic,
  isPGrpSp,
  isPGraphicFrame,
  isPCxnSp,
  isPSpPr,
  isPTxBody,
  isAP,
  isAR,
  isARPr,
  isAPPr,
  isATxBody,
  isAXfrm,
  isAOff,
  isAExt,
  isALn,
  isASolidFill,
  isATbl,
  isATr,
  isATc,
  isMcAlternateContent,
  getShapeProperties,
  getTextBody,
  getTransform,
  getOffset,
  getExtent,
  getParagraphs,
  getTextRuns,
  getRunText,
  getTableRows,
  getTableCells,
  type PSpElement,
  type PTxBodyElement,
  type PSpPrElement,
  type AXfrmElement,
  type ATblElement,
  type ATrElement,
} from "./ecma376";

/**
 * Helper to create a mock XmlElement
 */
function el(name: string, attrs: Record<string, string> = {}, children: XmlElement[] = []): XmlElement {
  return { type: "element", name, attrs, children };
}

describe("createElementGuard", () => {
  it("creates a guard that validates element name", () => {
    const isDiv = createElementGuard("div");
    expect(isDiv(el("div"))).toBe(true);
    expect(isDiv(el("span"))).toBe(false);
  });

  it("creates a guard with structure validation", () => {
    const isValidDiv = createElementGuard("div", (elem) => {
      return elem.children.length > 0;
    });
    expect(isValidDiv(el("div", {}, [el("span")]))).toBe(true);
    expect(isValidDiv(el("div"))).toBe(false);
  });

  it("returns false for non-elements", () => {
    const isDiv = createElementGuard("div");
    expect(isDiv(null)).toBe(false);
    expect(isDiv(undefined)).toBe(false);
    expect(isDiv({})).toBe(false);
    expect(isDiv({ type: "text", value: "hello" })).toBe(false);
  });
});

describe("getTypedChildElement", () => {
  it("returns typed child when guard passes", () => {
    const parent = el("p:sp", {}, [
      el("p:nvSpPr"),
      el("p:spPr"),
    ]);
    const spPr = getTypedChildElement(parent, "p:spPr", isPSpPr);
    expect(spPr).toBeDefined();
    expect(spPr?.name).toBe("p:spPr");
  });

  it("returns undefined when child not found", () => {
    const parent = el("p:sp", {}, [el("p:nvSpPr")]);
    const spPr = getTypedChildElement(parent, "p:spPr", isPSpPr);
    expect(spPr).toBeUndefined();
  });

  it("returns undefined when parent is undefined", () => {
    const spPr = getTypedChildElement(undefined, "p:spPr", isPSpPr);
    expect(spPr).toBeUndefined();
  });

  it("returns undefined when guard fails", () => {
    const parent = el("p:sp", {}, [el("p:txBody")]); // Not a spPr
    const spPr = getTypedChildElement(parent, "p:txBody", isPSpPr);
    expect(spPr).toBeUndefined();
  });
});

describe("getTypedChildren", () => {
  it("returns all matching typed children", () => {
    const parent = el("a:p", {}, [
      el("a:r"),
      el("a:r"),
      el("a:endParaRPr"),
    ]);
    const runs = getTypedChildren(parent, "a:r", isAR);
    expect(runs).toHaveLength(2);
  });

  it("returns empty array when no matches", () => {
    const parent = el("a:p", {}, []);
    const runs = getTypedChildren(parent, "a:r", isAR);
    expect(runs).toHaveLength(0);
  });

  it("returns empty array when parent is undefined", () => {
    const runs = getTypedChildren(undefined, "a:r", isAR);
    expect(runs).toHaveLength(0);
  });
});

describe("Attribute accessors", () => {
  describe("getTypedAttr", () => {
    it("returns attribute value", () => {
      const elem = el("a:off", { x: "100", y: "200" });
      expect(getTypedAttr(elem, "x")).toBe("100");
    });

    it("returns undefined for missing attribute", () => {
      const elem = el("a:off", { x: "100" });
      expect(getTypedAttr(elem, "y")).toBeUndefined();
    });

    it("returns undefined for undefined element", () => {
      expect(getTypedAttr(undefined, "x")).toBeUndefined();
    });
  });

  describe("getNumericAttr", () => {
    it("returns numeric value", () => {
      const elem = el("a:ext", { cx: "914400", cy: "457200" });
      expect(getNumericAttr(elem, "cx")).toBe(914400);
    });

    it("returns undefined for non-numeric value", () => {
      const elem = el("a:ext", { cx: "invalid" });
      expect(getNumericAttr(elem, "cx")).toBeUndefined();
    });
  });

  describe("getBooleanAttr", () => {
    it("returns true for '1'", () => {
      const elem = el("a:rPr", { b: "1" });
      expect(getBooleanAttr(elem, "b")).toBe(true);
    });

    it("returns true for 'true'", () => {
      const elem = el("a:rPr", { b: "true" });
      expect(getBooleanAttr(elem, "b")).toBe(true);
    });

    it("returns false for '0'", () => {
      const elem = el("a:rPr", { b: "0" });
      expect(getBooleanAttr(elem, "b")).toBe(false);
    });

    it("returns false for 'false'", () => {
      const elem = el("a:rPr", { b: "false" });
      expect(getBooleanAttr(elem, "b")).toBe(false);
    });

    it("returns undefined for other values", () => {
      const elem = el("a:rPr", { b: "maybe" });
      expect(getBooleanAttr(elem, "b")).toBeUndefined();
    });
  });
});

describe("PresentationML type guards", () => {
  describe("isPSp", () => {
    it("validates shape with nvSpPr", () => {
      const shape = el("p:sp", {}, [el("p:nvSpPr")]);
      expect(isPSp(shape)).toBe(true);
    });

    it("rejects shape without nvSpPr", () => {
      const shape = el("p:sp", {}, []);
      expect(isPSp(shape)).toBe(false);
    });

    it("rejects non-shape element", () => {
      const pic = el("p:pic", {}, [el("p:nvSpPr")]);
      expect(isPSp(pic)).toBe(false);
    });
  });

  describe("isPPic", () => {
    it("validates picture with nvPicPr", () => {
      const pic = el("p:pic", {}, [el("p:nvPicPr")]);
      expect(isPPic(pic)).toBe(true);
    });
  });

  describe("isPGrpSp", () => {
    it("validates group with nvGrpSpPr", () => {
      const grp = el("p:grpSp", {}, [el("p:nvGrpSpPr")]);
      expect(isPGrpSp(grp)).toBe(true);
    });
  });

  describe("isPGraphicFrame", () => {
    it("validates graphic frame with nvGraphicFramePr", () => {
      const gf = el("p:graphicFrame", {}, [el("p:nvGraphicFramePr")]);
      expect(isPGraphicFrame(gf)).toBe(true);
    });
  });

  describe("isPCxnSp", () => {
    it("validates connection shape with nvCxnSpPr", () => {
      const cxn = el("p:cxnSp", {}, [el("p:nvCxnSpPr")]);
      expect(isPCxnSp(cxn)).toBe(true);
    });
  });

  describe("isPSpPr", () => {
    it("validates shape properties", () => {
      const spPr = el("p:spPr");
      expect(isPSpPr(spPr)).toBe(true);
    });
  });

  describe("isPTxBody", () => {
    it("validates text body", () => {
      const txBody = el("p:txBody");
      expect(isPTxBody(txBody)).toBe(true);
    });
  });

  describe("isMcAlternateContent", () => {
    it("validates alternate content", () => {
      const mc = el("mc:AlternateContent");
      expect(isMcAlternateContent(mc)).toBe(true);
    });
  });
});

describe("DrawingML type guards", () => {
  describe("isAP", () => {
    it("validates paragraph", () => {
      expect(isAP(el("a:p"))).toBe(true);
    });
  });

  describe("isAR", () => {
    it("validates text run", () => {
      expect(isAR(el("a:r"))).toBe(true);
    });
  });

  describe("isARPr", () => {
    it("validates run properties", () => {
      expect(isARPr(el("a:rPr"))).toBe(true);
    });
  });

  describe("isAPPr", () => {
    it("validates paragraph properties", () => {
      expect(isAPPr(el("a:pPr"))).toBe(true);
    });
  });

  describe("isATxBody", () => {
    it("validates text body", () => {
      expect(isATxBody(el("a:txBody"))).toBe(true);
    });
  });

  describe("isAXfrm", () => {
    it("validates transform with off", () => {
      const xfrm = el("a:xfrm", {}, [el("a:off", { x: "0", y: "0" })]);
      expect(isAXfrm(xfrm)).toBe(true);
    });

    it("validates transform with ext", () => {
      const xfrm = el("a:xfrm", {}, [el("a:ext", { cx: "100", cy: "100" })]);
      expect(isAXfrm(xfrm)).toBe(true);
    });

    it("rejects transform without off or ext", () => {
      const xfrm = el("a:xfrm");
      expect(isAXfrm(xfrm)).toBe(false);
    });
  });

  describe("isAOff", () => {
    it("validates offset with x attribute", () => {
      const off = el("a:off", { x: "100", y: "200" });
      expect(isAOff(off)).toBe(true);
    });

    it("rejects offset without x", () => {
      const off = el("a:off", { y: "200" });
      expect(isAOff(off)).toBe(false);
    });
  });

  describe("isAExt", () => {
    it("validates extent with cx attribute", () => {
      const ext = el("a:ext", { cx: "100", cy: "200" });
      expect(isAExt(ext)).toBe(true);
    });
  });

  describe("isALn", () => {
    it("validates line properties", () => {
      expect(isALn(el("a:ln"))).toBe(true);
    });
  });

  describe("isASolidFill", () => {
    it("validates solid fill", () => {
      expect(isASolidFill(el("a:solidFill"))).toBe(true);
    });
  });
});

describe("Table type guards", () => {
  describe("isATbl", () => {
    it("validates table", () => {
      expect(isATbl(el("a:tbl"))).toBe(true);
    });
  });

  describe("isATr", () => {
    it("validates table row", () => {
      expect(isATr(el("a:tr"))).toBe(true);
    });
  });

  describe("isATc", () => {
    it("validates table cell", () => {
      expect(isATc(el("a:tc"))).toBe(true);
    });
  });
});

describe("Convenience accessors", () => {
  describe("getShapeProperties", () => {
    it("returns shape properties from shape", () => {
      const shape = el("p:sp", {}, [
        el("p:nvSpPr"),
        el("p:spPr"),
      ]) as PSpElement;
      const spPr = getShapeProperties(shape);
      expect(spPr).toBeDefined();
      expect(spPr?.name).toBe("p:spPr");
    });
  });

  describe("getTextBody", () => {
    it("returns text body from shape", () => {
      const shape = el("p:sp", {}, [
        el("p:nvSpPr"),
        el("p:txBody"),
      ]) as PSpElement;
      const txBody = getTextBody(shape);
      expect(txBody).toBeDefined();
      expect(txBody?.name).toBe("p:txBody");
    });
  });

  describe("getTransform", () => {
    it("returns transform from shape properties", () => {
      const spPr = el("p:spPr", {}, [
        el("a:xfrm", {}, [el("a:off", { x: "0", y: "0" })]),
      ]) as PSpPrElement;
      const xfrm = getTransform(spPr);
      expect(xfrm).toBeDefined();
      expect(xfrm?.name).toBe("a:xfrm");
    });
  });

  describe("getOffset", () => {
    it("returns offset from transform", () => {
      const xfrm = el("a:xfrm", {}, [
        el("a:off", { x: "100", y: "200" }),
      ]) as AXfrmElement;
      const off = getOffset(xfrm);
      expect(off).toBeDefined();
      expect(off?.attrs.x).toBe("100");
      expect(off?.attrs.y).toBe("200");
    });
  });

  describe("getExtent", () => {
    it("returns extent from transform", () => {
      const xfrm = el("a:xfrm", {}, [
        el("a:off", { x: "0", y: "0" }),
        el("a:ext", { cx: "914400", cy: "457200" }),
      ]) as AXfrmElement;
      const ext = getExtent(xfrm);
      expect(ext).toBeDefined();
      expect(ext?.attrs.cx).toBe("914400");
    });
  });

  describe("getParagraphs", () => {
    it("returns all paragraphs from text body", () => {
      const txBody = el("p:txBody", {}, [
        el("a:bodyPr"),
        el("a:p"),
        el("a:p"),
      ]) as PTxBodyElement;
      const paragraphs = getParagraphs(txBody);
      expect(paragraphs).toHaveLength(2);
    });
  });

  describe("getTextRuns", () => {
    it("returns all runs from paragraph", () => {
      const p = el("a:p", {}, [
        el("a:r"),
        el("a:r"),
        el("a:endParaRPr"),
      ]);
      // Need to cast after guard check
      if (isAP(p)) {
        const runs = getTextRuns(p);
        expect(runs).toHaveLength(2);
      }
    });
  });

  describe("getRunText", () => {
    it("returns text content from run", () => {
      const r = el("a:r", {}, [
        el("a:rPr"),
        {
          type: "element",
          name: "a:t",
          attrs: {},
          children: [{ type: "text", value: "Hello World" }],
        },
      ]);
      if (isAR(r)) {
        expect(getRunText(r)).toBe("Hello World");
      }
    });

    it("returns empty string for run without text", () => {
      const r = el("a:r", {}, [el("a:rPr")]);
      if (isAR(r)) {
        expect(getRunText(r)).toBe("");
      }
    });
  });

  describe("getTableRows", () => {
    it("returns all rows from table", () => {
      const tbl = el("a:tbl", {}, [
        el("a:tblGrid"),
        el("a:tr"),
        el("a:tr"),
      ]) as ATblElement;
      const rows = getTableRows(tbl);
      expect(rows).toHaveLength(2);
    });
  });

  describe("getTableCells", () => {
    it("returns all cells from row", () => {
      const tr = el("a:tr", {}, [
        el("a:tc"),
        el("a:tc"),
        el("a:tc"),
      ]) as ATrElement;
      const cells = getTableCells(tr);
      expect(cells).toHaveLength(3);
    });
  });
});

/**
 * @file Tests for OOXML type guards
 */

import { type XmlElement } from "../../xml";
import {
  isElementNamed,
  hasChildElement,
  isShapeElement,
  isPictureElement,
  isGroupShapeElement,
  isGraphicFrameElement,
  isConnectionShapeElement,
  isAlternateContentElement,
  isTableElement,
  isTableRowElement,
  isTableCellElement,
  isTextBodyElement,
  isParagraphElement,
  isTextRunElement,
  isRunPropertiesElement,
  isTransformElement,
  isListStyleElement,
  isSpacingElement,
  isLinePropertiesElement,
  isShapePropertiesElement,
  getTypedChild,
} from "./guards";

/**
 * Helper to create a mock XmlElement
 */
function createElement(name: string, children: XmlElement[] = []): XmlElement {
  return {
    type: "element",
    name,
    attrs: {},
    children,
  };
}

describe("isElementNamed", () => {
  it("returns true for matching element name", () => {
    const el = createElement("p:sp");
    expect(isElementNamed(el, "p:sp")).toBe(true);
  });

  it("returns false for non-matching element name", () => {
    const el = createElement("p:pic");
    expect(isElementNamed(el, "p:sp")).toBe(false);
  });

  it("returns false for non-element", () => {
    expect(isElementNamed(null, "p:sp")).toBe(false);
    expect(isElementNamed(undefined, "p:sp")).toBe(false);
    expect(isElementNamed({}, "p:sp")).toBe(false);
    expect(isElementNamed({ type: "text", value: "hello" }, "p:sp")).toBe(false);
  });
});

describe("hasChildElement", () => {
  it("returns true when child exists", () => {
    const parent = createElement("p:sp", [createElement("p:nvSpPr")]);
    expect(hasChildElement(parent, "p:nvSpPr")).toBe(true);
  });

  it("returns false when child does not exist", () => {
    const parent = createElement("p:sp", []);
    expect(hasChildElement(parent, "p:nvSpPr")).toBe(false);
  });
});

describe("PresentationML element guards", () => {
  describe("isShapeElement", () => {
    it("returns true for valid shape element", () => {
      const shape = createElement("p:sp", [createElement("p:nvSpPr")]);
      expect(isShapeElement(shape)).toBe(true);
    });

    it("returns false for element without nvSpPr", () => {
      const shape = createElement("p:sp", []);
      expect(isShapeElement(shape)).toBe(false);
    });

    it("returns false for wrong element name", () => {
      const el = createElement("p:pic", [createElement("p:nvSpPr")]);
      expect(isShapeElement(el)).toBe(false);
    });
  });

  describe("isPictureElement", () => {
    it("returns true for valid picture element", () => {
      const pic = createElement("p:pic", [createElement("p:nvPicPr")]);
      expect(isPictureElement(pic)).toBe(true);
    });

    it("returns false for element without nvPicPr", () => {
      const pic = createElement("p:pic", []);
      expect(isPictureElement(pic)).toBe(false);
    });
  });

  describe("isGroupShapeElement", () => {
    it("returns true for valid group shape element", () => {
      const grp = createElement("p:grpSp", [createElement("p:nvGrpSpPr")]);
      expect(isGroupShapeElement(grp)).toBe(true);
    });
  });

  describe("isGraphicFrameElement", () => {
    it("returns true for valid graphic frame element", () => {
      const gf = createElement("p:graphicFrame", [createElement("p:nvGraphicFramePr")]);
      expect(isGraphicFrameElement(gf)).toBe(true);
    });
  });

  describe("isConnectionShapeElement", () => {
    it("returns true for valid connection shape element", () => {
      const cxn = createElement("p:cxnSp", [createElement("p:nvCxnSpPr")]);
      expect(isConnectionShapeElement(cxn)).toBe(true);
    });
  });

  describe("isAlternateContentElement", () => {
    it("returns true for mc:AlternateContent", () => {
      const mc = createElement("mc:AlternateContent");
      expect(isAlternateContentElement(mc)).toBe(true);
    });
  });
});

describe("Table element guards", () => {
  describe("isTableElement", () => {
    it("returns true for a:tbl", () => {
      const tbl = createElement("a:tbl");
      expect(isTableElement(tbl)).toBe(true);
    });
  });

  describe("isTableRowElement", () => {
    it("returns true for a:tr", () => {
      const tr = createElement("a:tr");
      expect(isTableRowElement(tr)).toBe(true);
    });
  });

  describe("isTableCellElement", () => {
    it("returns true for a:tc", () => {
      const tc = createElement("a:tc");
      expect(isTableCellElement(tc)).toBe(true);
    });
  });
});

describe("DrawingML element guards", () => {
  describe("isTextBodyElement", () => {
    it("returns true for a:txBody", () => {
      const txBody = createElement("a:txBody");
      expect(isTextBodyElement(txBody)).toBe(true);
    });

    it("returns true for p:txBody", () => {
      const txBody = createElement("p:txBody");
      expect(isTextBodyElement(txBody)).toBe(true);
    });
  });

  describe("isParagraphElement", () => {
    it("returns true for a:p", () => {
      const p = createElement("a:p");
      expect(isParagraphElement(p)).toBe(true);
    });
  });

  describe("isTextRunElement", () => {
    it("returns true for a:r", () => {
      const r = createElement("a:r");
      expect(isTextRunElement(r)).toBe(true);
    });
  });

  describe("isRunPropertiesElement", () => {
    it("returns true for a:rPr", () => {
      const rPr = createElement("a:rPr");
      expect(isRunPropertiesElement(rPr)).toBe(true);
    });
  });

  describe("isTransformElement", () => {
    it("returns true for a:xfrm with a:off", () => {
      const xfrm = createElement("a:xfrm", [createElement("a:off")]);
      expect(isTransformElement(xfrm)).toBe(true);
    });

    it("returns true for a:xfrm with a:ext", () => {
      const xfrm = createElement("a:xfrm", [createElement("a:ext")]);
      expect(isTransformElement(xfrm)).toBe(true);
    });

    it("returns false for a:xfrm without off or ext", () => {
      const xfrm = createElement("a:xfrm");
      expect(isTransformElement(xfrm)).toBe(false);
    });
  });

  describe("isListStyleElement", () => {
    it("returns true for a:lstStyle", () => {
      const lstStyle = createElement("a:lstStyle");
      expect(isListStyleElement(lstStyle)).toBe(true);
    });
  });

  describe("isSpacingElement", () => {
    it("returns true for a:lnSpc", () => {
      expect(isSpacingElement(createElement("a:lnSpc"))).toBe(true);
    });

    it("returns true for a:spcBef", () => {
      expect(isSpacingElement(createElement("a:spcBef"))).toBe(true);
    });

    it("returns true for a:spcAft", () => {
      expect(isSpacingElement(createElement("a:spcAft"))).toBe(true);
    });
  });

  describe("isLinePropertiesElement", () => {
    it("returns true for a:ln", () => {
      const ln = createElement("a:ln");
      expect(isLinePropertiesElement(ln)).toBe(true);
    });
  });

  describe("isShapePropertiesElement", () => {
    it("returns true for p:spPr", () => {
      const spPr = createElement("p:spPr");
      expect(isShapePropertiesElement(spPr)).toBe(true);
    });
  });
});

describe("getTypedChild", () => {
  it("returns typed child when guard passes", () => {
    const parent = createElement("p:sp", [
      createElement("p:nvSpPr"),
      createElement("a:p"),
    ]);
    const result = getTypedChild(parent, "a:p", isParagraphElement);
    expect(result).toBeDefined();
    expect(result?.name).toBe("a:p");
  });

  it("returns undefined when child does not exist", () => {
    const parent = createElement("p:sp");
    const result = getTypedChild(parent, "a:p", isParagraphElement);
    expect(result).toBeUndefined();
  });

  it("returns undefined when parent is undefined", () => {
    const result = getTypedChild(undefined, "a:p", isParagraphElement);
    expect(result).toBeUndefined();
  });

  it("returns undefined when guard fails", () => {
    const parent = createElement("p:sp", [createElement("a:r")]);
    // Try to get a:r as if it were a paragraph (wrong type)
    const result = getTypedChild(parent, "a:r", isParagraphElement);
    expect(result).toBeUndefined();
  });
});

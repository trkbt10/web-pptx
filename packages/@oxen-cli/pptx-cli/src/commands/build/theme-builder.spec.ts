/**
 * @file Tests for theme-builder
 */

import { createElement, getChild, parseXml, serializeDocument, type XmlDocument, type XmlElement } from "@oxen/xml";
import { applyThemeEditsToThemeXml } from "./theme-builder";

function doc(root: XmlElement): XmlDocument {
  return { children: [root] };
}

describe("theme-builder", () => {
  it("patches clrScheme and fontScheme", () => {
    const themeXml = doc(
      createElement("a:theme", { name: "Office Theme" }, [
        createElement("a:themeElements", {}, [
          createElement("a:clrScheme", { name: "Office" }, [
            createElement("a:dk1", {}, [createElement("a:sysClr", { val: "windowText", lastClr: "000000" })]),
            createElement("a:lt1", {}, [createElement("a:sysClr", { val: "window", lastClr: "FFFFFF" })]),
            createElement("a:accent1", {}, [createElement("a:srgbClr", { val: "4472C4" })]),
          ]),
          createElement("a:fontScheme", { name: "Office" }, [
            createElement("a:majorFont", {}, [
              createElement("a:latin", { typeface: "Calibri Light" }),
              createElement("a:ea", { typeface: "" }),
              createElement("a:cs", { typeface: "" }),
            ]),
            createElement("a:minorFont", {}, [
              createElement("a:latin", { typeface: "Calibri" }),
              createElement("a:ea", { typeface: "" }),
              createElement("a:cs", { typeface: "" }),
            ]),
          ]),
        ]),
      ]),
    );

    const themeXmlText = serializeDocument(themeXml, { declaration: true, standalone: true });

    const updatedXmlText = applyThemeEditsToThemeXml(themeXmlText, {
      colorScheme: { dk1: "111111", accent1: "FF0000" },
      fontScheme: { majorFont: { latin: "Aptos Display" }, minorFont: { latin: "Aptos" } },
    });

    const updated = parseXml(updatedXmlText);
    const root = updated.children[0] as XmlElement;
    const themeElements = getChild(root, "a:themeElements")!;
    const clrScheme = getChild(themeElements, "a:clrScheme")!;
    expect(getChild(getChild(clrScheme, "a:dk1")!, "a:srgbClr")?.attrs.val).toBe("111111");
    expect(getChild(getChild(clrScheme, "a:accent1")!, "a:srgbClr")?.attrs.val).toBe("FF0000");

    const fontScheme = getChild(themeElements, "a:fontScheme")!;
    expect(getChild(getChild(fontScheme, "a:majorFont")!, "a:latin")?.attrs.typeface).toBe("Aptos Display");
    expect(getChild(getChild(fontScheme, "a:minorFont")!, "a:latin")?.attrs.typeface).toBe("Aptos");
  });
});


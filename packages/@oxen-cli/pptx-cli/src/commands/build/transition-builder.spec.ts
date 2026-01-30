/**
 * @file Tests for transition-builder
 */

import { getByPath, getChild, parseXml, type XmlElement } from "@oxen/xml";
import { applySlideTransition } from "./transition-builder";

describe("transition-builder", () => {
  const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:spTree/>
  </p:cSld>
</p:sld>`;

  it("inserts p:transition with basic attributes", () => {
    const doc = parseXml(slideXml);
    const next = applySlideTransition(doc, {
      type: "fade",
      duration: 2000,
      advanceOnClick: false,
      advanceAfter: 1234,
    });

    const transition = getByPath(next, ["p:sld", "p:transition"]) as XmlElement | undefined;
    expect(transition?.name).toBe("p:transition");
    expect(transition?.attrs.spd).toBe("slow");
    expect(transition?.attrs.advClick).toBe("0");
    expect(transition?.attrs.advTm).toBe("1234");

    const fade = getChild(transition!, "p:fade") as XmlElement | undefined;
    expect(fade?.name).toBe("p:fade");
  });

  it("writes direction attribute for 8-direction transitions", () => {
    const doc = parseXml(slideXml);
    const next = applySlideTransition(doc, { type: "push", direction: "l" });

    const transition = getByPath(next, ["p:sld", "p:transition"]) as XmlElement | undefined;
    const push = getChild(transition!, "p:push") as XmlElement | undefined;
    expect(push?.attrs.dir).toBe("l");
  });

  it("removes p:transition when type is none", () => {
    const withTransition = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:spTree/>
  </p:cSld>
  <p:transition><p:fade/></p:transition>
</p:sld>`;

    const doc = parseXml(withTransition);
    const next = applySlideTransition(doc, { type: "none" });

    const transition = getByPath(next, ["p:sld", "p:transition"]);
    expect(transition).toBeUndefined();
  });
});


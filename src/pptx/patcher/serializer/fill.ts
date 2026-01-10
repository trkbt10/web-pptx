/**
 * @file Fill serializer
 */

import type { XmlElement } from "../../../xml";
import type {
  BlipFill,
  Fill,
  GradientFill,
  GradientStop,
  PatternFill,
  StretchFill,
  TileFill,
} from "../../domain";
import { createElement } from "../core/xml-mutator";
import { serializeColor } from "./color";
import { ooxmlBool, ooxmlAngleUnits, ooxmlEmu, ooxmlPercent100k } from "./units";

export function serializeFill(fill: Fill): XmlElement {
  switch (fill.type) {
    case "noFill":
      return createElement("a:noFill");
    case "solidFill":
      return createElement("a:solidFill", {}, [serializeColor(fill.color)]);
    case "gradientFill":
      return serializeGradientFill(fill);
    case "patternFill":
      return serializePatternFill(fill);
    case "blipFill":
      return serializeBlipFill(fill);
    case "groupFill":
      return createElement("a:grpFill");
  }
}

export function serializeGradientFill(gradient: GradientFill): XmlElement {
  const attrs: Record<string, string> = {
    rotWithShape: ooxmlBool(gradient.rotWithShape),
  };

  const children: XmlElement[] = [
    createElement("a:gsLst", {}, gradient.stops.map(serializeGradientStop)),
  ];

  if (gradient.linear) {
    children.push(
      createElement("a:lin", {
        ang: ooxmlAngleUnits(gradient.linear.angle),
        scaled: ooxmlBool(gradient.linear.scaled),
      }),
    );
  }

  if (gradient.path) {
    const pathChildren: XmlElement[] = [];
    if (gradient.path.fillToRect) {
      pathChildren.push(
        createElement("a:fillToRect", {
          l: ooxmlPercent100k(gradient.path.fillToRect.left),
          t: ooxmlPercent100k(gradient.path.fillToRect.top),
          r: ooxmlPercent100k(gradient.path.fillToRect.right),
          b: ooxmlPercent100k(gradient.path.fillToRect.bottom),
        }),
      );
    }
    children.push(
      createElement(
        "a:path",
        { path: gradient.path.path },
        pathChildren,
      ),
    );
  }

  if (gradient.tileRect) {
    children.push(
      createElement("a:tileRect", {
        l: ooxmlPercent100k(gradient.tileRect.left),
        t: ooxmlPercent100k(gradient.tileRect.top),
        r: ooxmlPercent100k(gradient.tileRect.right),
        b: ooxmlPercent100k(gradient.tileRect.bottom),
      }),
    );
  }

  return createElement("a:gradFill", attrs, children);
}

function serializeGradientStop(stop: GradientStop): XmlElement {
  return createElement(
    "a:gs",
    { pos: ooxmlPercent100k(stop.position) },
    [serializeColor(stop.color)],
  );
}

export function serializePatternFill(pattern: PatternFill): XmlElement {
  return createElement("a:pattFill", { prst: pattern.preset }, [
    createElement("a:fgClr", {}, [serializeColor(pattern.foregroundColor)]),
    createElement("a:bgClr", {}, [serializeColor(pattern.backgroundColor)]),
  ]);
}

export function serializeBlipFill(blip: BlipFill): XmlElement {
  if (blip.resourceId.startsWith("data:")) {
    throw new Error("serializeBlipFill: data: resourceId requires Phase 7 media embedding");
  }

  const attrs: Record<string, string> = {
    rotWithShape: ooxmlBool(blip.rotWithShape),
  };

  const blipAttrs: Record<string, string> = {
  };
  if (blip.relationshipType === "link") {
    blipAttrs["r:link"] = blip.resourceId;
  } else {
    blipAttrs["r:embed"] = blip.resourceId;
  }
  if (blip.compressionState) {
    blipAttrs.cstate = blip.compressionState;
  }

  const children: XmlElement[] = [createElement("a:blip", blipAttrs)];

  if (blip.sourceRect) {
    children.push(
      createElement("a:srcRect", {
        l: ooxmlPercent100k(blip.sourceRect.left),
        t: ooxmlPercent100k(blip.sourceRect.top),
        r: ooxmlPercent100k(blip.sourceRect.right),
        b: ooxmlPercent100k(blip.sourceRect.bottom),
      }),
    );
  }

  if (blip.stretch) {
    children.push(serializeStretchFill(blip.stretch));
  }

  if (blip.tile) {
    children.push(serializeTileFill(blip.tile));
  }

  return createElement("a:blipFill", attrs, children);
}

function serializeStretchFill(stretch: StretchFill): XmlElement {
  if (!stretch.fillRect) {
    return createElement("a:stretch");
  }

  return createElement("a:stretch", {}, [
    createElement("a:fillRect", {
      l: ooxmlPercent100k(stretch.fillRect.left),
      t: ooxmlPercent100k(stretch.fillRect.top),
      r: ooxmlPercent100k(stretch.fillRect.right),
      b: ooxmlPercent100k(stretch.fillRect.bottom),
    }),
  ]);
}

function serializeTileFill(tile: TileFill): XmlElement {
  return createElement("a:tile", {
    tx: ooxmlEmu(tile.tx),
    ty: ooxmlEmu(tile.ty),
    sx: ooxmlPercent100k(tile.sx),
    sy: ooxmlPercent100k(tile.sy),
    flip: tile.flip,
    algn: tile.alignment,
  });
}

/**
 * @file Background building utilities for PPTX slides
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { createElement, type XmlElement, type XmlDocument } from "@oxen/xml";
import { updateDocumentRoot, replaceChildByName } from "@oxen-office/pptx/patcher/core/xml-mutator";
import { getChild, isXmlElement } from "@oxen/xml";
import { serializeFill } from "@oxen-office/pptx/patcher/serializer/fill";
import { addMedia } from "@oxen-office/pptx/patcher/resources/media-manager";
import type { Fill } from "@oxen-office/pptx/domain/color/types";
import type { ZipPackage } from "@oxen/zip";
import type { Degrees } from "@oxen-office/ooxml/domain/units";
import type { BackgroundFillSpec, BackgroundGradientSpec, BackgroundImageSpec } from "./types";

/**
 * Build a Fill from BackgroundFillSpec
 */
function buildBackgroundFill(spec: BackgroundFillSpec): Fill {
  if (typeof spec === "string") {
    // Solid fill from hex color
    return {
      type: "solidFill",
      color: { spec: { type: "srgb", value: spec } },
    };
  }

  switch (spec.type) {
    case "solid":
      return {
        type: "solidFill",
        color: { spec: { type: "srgb", value: spec.color } },
      };
    case "gradient":
      return buildGradientFill(spec);
    case "image":
      // Image fill requires async handling and relationship creation
      // Return a placeholder that will be handled separately
      throw new Error("Image background requires async handling");
    default:
      throw new Error(`Unknown background fill type: ${(spec as { type: string }).type}`);
  }
}

/**
 * Build gradient fill for background
 */
function buildGradientFill(spec: BackgroundGradientSpec): Fill {
  const stops = spec.stops.map((stop) => ({
    position: stop.position * 1000, // Convert 0-100 to 0-100000
    color: { spec: { type: "srgb" as const, value: stop.color } },
  }));

  return {
    type: "gradientFill",
    stops,
    linear: {
      angle: (spec.angle ?? 0) as Degrees,
      scaled: false,
    },
    rotWithShape: false,
  };
}

/**
 * Build background XML element from Fill
 */
function buildBackgroundElement(fill: Fill): XmlElement {
  const fillXml = serializeFill(fill);

  // Create p:bgPr element with the fill
  const bgPr = createElement("p:bgPr", {}, [fillXml]);

  // Create p:bg element containing bgPr
  return createElement("p:bg", {}, [bgPr]);
}

/**
 * Build blip fill background for images
 */
function buildBlipFillBackground(rId: string, mode: "stretch" | "tile" | "cover" = "stretch"): XmlElement {
  const blipElement = createElement("a:blip", { "r:embed": rId });

  let fillMode: XmlElement;
  if (mode === "tile") {
    fillMode = createElement("a:tile", {
      tx: "0",
      ty: "0",
      sx: "100000",
      sy: "100000",
      flip: "none",
      algn: "tl",
    });
  } else {
    // stretch or cover - use stretch
    fillMode = createElement("a:stretch", {}, [
      createElement("a:fillRect"),
    ]);
  }

  const blipFill = createElement("a:blipFill", { rotWithShape: "0" }, [
    blipElement,
    fillMode,
  ]);

  const bgPr = createElement("p:bgPr", {}, [blipFill]);
  return createElement("p:bg", {}, [bgPr]);
}

type XmlChild = XmlElement["children"][number];

function withoutBackground(children: XmlElement["children"]): XmlChild[] {
  return children.filter((c) => !(isXmlElement(c) && c.name === "p:bg"));
}

/**
 * Apply background to slide XML document
 */
export function applyBackground(
  slideDoc: XmlDocument,
  spec: Exclude<BackgroundFillSpec, BackgroundImageSpec>,
): XmlDocument {
  const fill = buildBackgroundFill(spec);
  const bgElement = buildBackgroundElement(fill);

  return updateDocumentRoot(slideDoc, (root) => {
    const cSld = getChild(root, "p:cSld");
    if (!cSld) {return root;}

    // Remove existing background if present
    const existingBg = getChild(cSld, "p:bg");
    const filteredChildren = existingBg ? withoutBackground(cSld.children) : cSld.children;

    // p:bg should be the first child of p:cSld
    const newCsld: XmlElement = {
      ...cSld,
      children: [bgElement, ...filteredChildren],
    };

    return replaceChildByName(root, "p:cSld", newCsld);
  });
}

/**
 * Apply image background to slide XML document (async for file loading)
 */
export async function applyImageBackground(
  slideDoc: XmlDocument,
  spec: BackgroundImageSpec,
  ctx: { specDir: string; zipPackage: ZipPackage; slidePath: string },
): Promise<XmlDocument> {
  const imagePath = path.resolve(ctx.specDir, spec.path);
  const imageBuffer = await fs.readFile(imagePath);
  const mimeType = detectMimeType(imagePath);

  // Create a proper ArrayBuffer copy from the buffer
  const arrayBuffer = new ArrayBuffer(imageBuffer.length);
  const view = new Uint8Array(arrayBuffer);
  view.set(imageBuffer);

  const { rId } = addMedia({
    pkg: ctx.zipPackage,
    mediaData: arrayBuffer,
    mediaType: mimeType,
    referringPart: ctx.slidePath,
  });

  const bgElement = buildBlipFillBackground(rId, spec.mode ?? "stretch");

  return updateDocumentRoot(slideDoc, (root) => {
    const cSld = getChild(root, "p:cSld");
    if (!cSld) {return root;}

    // Remove existing background if present
    const existingBg = getChild(cSld, "p:bg");
    const filteredChildren = existingBg ? withoutBackground(cSld.children) : cSld.children;

    // p:bg should be the first child of p:cSld
    const newCsld: XmlElement = {
      ...cSld,
      children: [bgElement, ...filteredChildren],
    };

    return replaceChildByName(root, "p:cSld", newCsld);
  });
}

/**
 * Detect MIME type from file path
 */
function detectMimeType(filePath: string): "image/png" | "image/jpeg" | "image/gif" | "image/svg+xml" {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    default:
      return "image/png";
  }
}

/**
 * Check if background spec is image type
 */
export function isImageBackground(spec: BackgroundFillSpec): spec is BackgroundImageSpec {
  return typeof spec === "object" && spec.type === "image";
}

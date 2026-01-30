/**
 * @file Slide transition builder for Build command
 */

import { createElement, getChild, isXmlElement, type XmlDocument, type XmlElement } from "@oxen/xml";
import { updateDocumentRoot } from "@oxen-office/pptx/patcher";
import type { SlideTransitionSpec, TransitionType } from "./types";

function booleanAttr(value: boolean): "1" | "0" {
  return value ? "1" : "0";
}

function durationToSpeed(durationMs: number): "fast" | "med" | "slow" {
  if (durationMs >= 1500) {
    return "slow";
  }
  if (durationMs >= 750) {
    return "med";
  }
  return "fast";
}

function buildTransitionTypeElement(spec: SlideTransitionSpec): XmlElement {
  const type = spec.type;
  const attrs: Record<string, string> = {};

  const dir8 = spec.direction;
  const orient = spec.orientation;
  const spokes = spec.spokes;
  const inOut = spec.inOutDirection;

  const usesDir8 =
    type === "wipe" || type === "push" || type === "cover" || type === "pull" || type === "strips";
  const usesOrientation =
    type === "blinds" || type === "checker" || type === "comb" || type === "randomBar";
  const usesSpokes = type === "wheel";
  const usesInOut = type === "split" || type === "zoom";

  if (dir8 !== undefined && !usesDir8) {
    throw new Error(`buildTransitionTypeElement: direction is not supported for transition type "${type}"`);
  }
  if (orient !== undefined && !usesOrientation) {
    throw new Error(`buildTransitionTypeElement: orientation is not supported for transition type "${type}"`);
  }
  if (spokes !== undefined && !usesSpokes) {
    throw new Error(`buildTransitionTypeElement: spokes is not supported for transition type "${type}"`);
  }
  if (inOut !== undefined && !usesInOut) {
    throw new Error(`buildTransitionTypeElement: inOutDirection is not supported for transition type "${type}"`);
  }

  if (usesDir8 && dir8 !== undefined) {
    attrs.dir = dir8;
  }
  if (usesOrientation && orient !== undefined) {
    attrs.dir = orient;
  }
  if (usesSpokes && spokes !== undefined) {
    attrs.spkCnt = `${spokes}`;
  }
  if (usesInOut && inOut !== undefined) {
    attrs.dir = inOut;
  }

  return createElement(`p:${type}`, attrs);
}

function insertTransitionAfter(root: XmlElement, transition: XmlElement, afterName: string): XmlElement {
  const out: XmlElement["children"] = [];
  let inserted = false;

  for (const child of root.children) {
    if (isXmlElement(child) && child.name === "p:transition") {
      continue;
    }
    out.push(child);
    if (!inserted && isXmlElement(child) && child.name === afterName) {
      out.push(transition);
      inserted = true;
    }
  }

  if (!inserted) {
    out.push(transition);
  }

  return { ...root, children: out };
}

function removeTransition(root: XmlElement): XmlElement {
  const children = root.children.filter((c) => !(isXmlElement(c) && c.name === "p:transition"));
  return { ...root, children };
}

export function applySlideTransition(slideDoc: XmlDocument, transition: SlideTransitionSpec): XmlDocument {
  if (transition.type === "none") {
    return updateDocumentRoot(slideDoc, removeTransition);
  }

  const attrs: Record<string, string> = {};
  if (transition.duration !== undefined) {
    attrs.spd = durationToSpeed(transition.duration);
  }
  if (transition.advanceOnClick !== undefined) {
    attrs.advClick = booleanAttr(transition.advanceOnClick);
  }
  if (transition.advanceAfter !== undefined) {
    attrs.advTm = `${transition.advanceAfter}`;
  }

  const typeEl = buildTransitionTypeElement(transition);
  const transitionEl = createElement("p:transition", attrs, [typeEl]);

  return updateDocumentRoot(slideDoc, (root) => {
    const clrMapOvr = getChild(root, "p:clrMapOvr");
    if (clrMapOvr) {
      return insertTransitionAfter(root, transitionEl, "p:clrMapOvr");
    }
    return insertTransitionAfter(root, transitionEl, "p:cSld");
  });
}

export function isTransitionType(value: string): value is TransitionType {
  const types: TransitionType[] = [
    "blinds",
    "checker",
    "circle",
    "comb",
    "cover",
    "cut",
    "diamond",
    "dissolve",
    "fade",
    "newsflash",
    "plus",
    "pull",
    "push",
    "random",
    "randomBar",
    "split",
    "strips",
    "wedge",
    "wheel",
    "wipe",
    "zoom",
    "none",
  ];
  return types.includes(value as TransitionType);
}


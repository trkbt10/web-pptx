/**
 * @file Slide transition parser
 *
 * Parses slide transition data from slide content XML.
 *
 * @see ECMA-376 Part 1, Section 19.5 (Transitions)
 */

import type { XmlDocument } from "../../../xml";
import type { SlideTransition } from "../../domain";
import { getByPath } from "../../../xml";
import { parseTransition } from "./slide-parser";
import type { XmlElement } from "../../../xml";
import { getChild } from "../../../xml";
import { processAlternateContent } from "../shape-parser/alternate-content";

/**
 * Get the transition element from a slide, handling mc:AlternateContent.
 */
function getTransitionElement(parent: XmlElement | undefined): XmlElement | undefined {
  if (!parent) {
    return undefined;
  }

  const transition = getChild(parent, "p:transition");
  if (transition) {
    return transition;
  }

  const alternateContent = getChild(parent, "mc:AlternateContent");
  if (!alternateContent) {
    return undefined;
  }

  return processAlternateContent(alternateContent, "p:transition");
}

/**
 * Parse slide transition data from slide content XML.
 *
 * @param content - The slide content XML document (p:sld)
 * @returns SlideTransition if the slide has a transition, undefined otherwise
 */
export function parseSlideTransitionData(content: XmlDocument | undefined): SlideTransition | undefined {
  if (!content) {
    return undefined;
  }

  const sld = getByPath(content, ["p:sld"]);
  if (!sld) {
    return undefined;
  }

  const transitionElement = getTransitionElement(sld as XmlElement);
  return parseTransition(transitionElement);
}

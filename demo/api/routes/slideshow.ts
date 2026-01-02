/**
 * @file Slideshow API routes
 *
 * Provides endpoints for the slideshow viewer, including:
 * - Slide data with animation steps and transitions
 * - Notes extraction
 */

import { Hono } from "hono";
import { getFileById, loadPresentation, renderSlide, getTimingData } from "../services/pptx-loader";
import { extractAnimationSteps, extractInitiallyHiddenShapes } from "../../app/lib/animation-step-extractor";
import type { SlideshowData, SlideTransitionConfig } from "../../shared/types";
import { parseXml, getChild, isXmlElement, isXmlText, type XmlElement } from "../../../src/xml";

export const slideshowRouter = new Hono();

/**
 * Get complete slideshow data for a slide
 */
slideshowRouter.get("/:id/:num", async (c) => {
  const id = c.req.param("id");
  const num = parseInt(c.req.param("num"), 10);
  const fileInfo = getFileById(id);

  if (!fileInfo) {
    return c.json({ error: "File not found" }, 404);
  }

  try {
    const { presentation, cache } = await loadPresentation(fileInfo);

    // Render HTML content
    const htmlContent = await renderSlide(fileInfo, num, "html");

    // Get timing data
    const timingData = await getTimingData(fileInfo, num);

    // Extract animation steps
    const steps = extractAnimationSteps(timingData.rootTimeNode);

    // Extract initially hidden shapes
    const initiallyHiddenShapes = extractInitiallyHiddenShapes(timingData.rootTimeNode);

    // Parse transition from slide XML
    const slideXml = cache.get(`ppt/slides/slide${num}.xml`)?.text;
    const transition = slideXml ? parseSlideTransition(slideXml) : undefined;

    // Extract notes
    const notes = await extractNotes(cache, num);

    const data: SlideshowData = {
      slideNumber: num,
      totalSlides: presentation.count,
      htmlContent,
      size: presentation.size,
      steps,
      transition,
      initiallyHiddenShapes,
      notes,
    };

    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
});

/**
 * Get notes for a slide
 */
slideshowRouter.get("/notes/:id/:num", async (c) => {
  const id = c.req.param("id");
  const num = parseInt(c.req.param("num"), 10);
  const fileInfo = getFileById(id);

  if (!fileInfo) {
    return c.json({ error: "File not found" }, 404);
  }

  try {
    const { cache } = await loadPresentation(fileInfo);
    const notes = await extractNotes(cache, num);
    return c.json({ notes: notes ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
});

/**
 * Parse slide transition from XML
 */
function parseSlideTransition(slideXml: string): SlideTransitionConfig | undefined {
  try {
    const doc = parseXml(slideXml);

    // Find p:sld element
    const sld = doc.children.find(
      (c) => isXmlElement(c) && c.name === "p:sld"
    ) as XmlElement | undefined;
    if (!sld) return undefined;

    // Find p:transition element
    const transition = getChild(sld, "p:transition");
    if (!transition) return undefined;

    // Find transition type by checking child elements
    let type: SlideTransitionConfig["type"] = "none";
    for (const child of transition.children) {
      if (isXmlElement(child) && child.name.startsWith("p:")) {
        const transType = child.name.substring(2);
        if (isValidTransitionType(transType)) {
          type = transType;
          break;
        }
      }
    }

    // Parse duration
    const spd = getAttr(transition, "spd");
    const duration = spd === "slow" ? 2000 : spd === "med" ? 1000 : 500;

    // Parse advance settings
    const advClick = getAttr(transition, "advClick");
    const advanceOnClick = advClick !== "0";

    const advTm = getAttr(transition, "advTm");
    const advanceAfter = advTm ? parseInt(advTm, 10) : undefined;

    return {
      type,
      duration,
      advanceOnClick,
      advanceAfter,
    };
  } catch {
    return undefined;
  }
}

/**
 * Extract notes from notesSlide XML
 */
async function extractNotes(
  cache: Map<string, { text: string; buffer: ArrayBuffer }>,
  slideNum: number
): Promise<string | undefined> {
  const notesPath = `ppt/notesSlides/notesSlide${slideNum}.xml`;
  const notesXml = cache.get(notesPath)?.text;

  if (!notesXml) return undefined;

  try {
    const doc = parseXml(notesXml);

    // Find p:notes element
    const notes = doc.children.find(
      (c) => isXmlElement(c) && c.name === "p:notes"
    ) as XmlElement | undefined;
    if (!notes) return undefined;

    // Find p:cSld > p:spTree
    const cSld = getChild(notes, "p:cSld");
    if (!cSld) return undefined;

    const spTree = getChild(cSld, "p:spTree");
    if (!spTree) return undefined;

    // Find placeholder with type="body" for notes text
    let bodyShape: XmlElement | undefined;
    for (const child of spTree.children) {
      if (!isXmlElement(child) || child.name !== "p:sp") continue;

      const nvSpPr = getChild(child, "p:nvSpPr");
      if (!nvSpPr) continue;

      const nvPr = getChild(nvSpPr, "p:nvPr");
      if (!nvPr) continue;

      const ph = getChild(nvPr, "p:ph");
      if (ph && getAttr(ph, "type") === "body") {
        bodyShape = child;
        break;
      }
    }

    if (!bodyShape) return undefined;

    // Extract text from txBody > a:p > a:r > a:t
    const txBody = getChild(bodyShape, "p:txBody");
    if (!txBody) return undefined;

    const textParts: string[] = [];
    for (const pEl of txBody.children) {
      if (!isXmlElement(pEl) || pEl.name !== "a:p") continue;

      const paragraphText: string[] = [];
      for (const pChild of pEl.children) {
        if (!isXmlElement(pChild)) continue;

        if (pChild.name === "a:r") {
          const t = getChild(pChild, "a:t");
          if (t && t.children.length > 0) {
            const text = t.children
              .filter(isXmlText)
              .map((c) => c.value)
              .join("");
            paragraphText.push(text);
          }
        }
      }

      if (paragraphText.length > 0) {
        textParts.push(paragraphText.join(""));
      }
    }

    return textParts.length > 0 ? textParts.join("\n") : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Get attribute from element
 */
function getAttr(element: XmlElement, name: string): string | undefined {
  return element.attrs?.[name];
}

/**
 * Check if string is valid transition type
 */
function isValidTransitionType(value: string): value is SlideTransitionConfig["type"] {
  const types = [
    "blinds", "checker", "circle", "comb", "cover", "cut", "diamond",
    "dissolve", "fade", "newsflash", "plus", "pull", "push", "random",
    "randomBar", "split", "strips", "wedge", "wheel", "wipe", "zoom", "none",
  ];
  return types.includes(value);
}

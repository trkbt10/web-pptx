/**
 * @file Glyph extraction Web Worker
 *
 * Extracts glyph contours in a background thread.
 * Uses OffscreenCanvas for rendering.
 */

import type { GlyphContour, GlyphStyleKey } from "../types";
import { extractContours, processContours } from "./contour";
import { formatFontFamily, GENERIC_FONT_FAMILIES } from "./font-format";

// =============================================================================
// Types
// =============================================================================

type WorkerRequest = {
  id: number;
  type: "extractGlyph";
  char: string;
  fontFamily: string;
  style: GlyphStyleKey;
};

type WorkerResponse =
  | {
      id: number;
      type: "glyphResult";
      glyph: GlyphContour;
    }
  | {
      id: number;
      type: "glyphError";
      message: string;
    };

// =============================================================================
// Configuration
// =============================================================================

const RENDER_SCALE = 2;

// =============================================================================
// Worker Message Handler
// =============================================================================

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, type, char, fontFamily, style } = event.data;

  if (type === "extractGlyph") {
    try {
      const glyph = extractGlyphInWorker(char, fontFamily, style);
      const response: WorkerResponse = { id, type: "glyphResult", glyph };
      self.postMessage(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Worker glyph extraction failed.";
      const response: WorkerResponse = { id, type: "glyphError", message };
      self.postMessage(response);
    }
  }
};

// =============================================================================
// Glyph Extraction
// =============================================================================

function extractGlyphInWorker(
  char: string,
  fontFamily: string,
  style: GlyphStyleKey,
): GlyphContour {
  // Handle whitespace
  if (char === " " || char === "\t" || char === "\n") {
    return createWhitespaceGlyph(char, fontFamily, style);
  }

  const scaledSize = style.fontSize * RENDER_SCALE;
  const canvas = new OffscreenCanvas(256, 256);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  if (!ctx) {
    throw new Error("Worker canvas context unavailable.");
  }

  // Set font and measure
  const fontString = `${style.fontStyle} ${style.fontWeight} ${scaledSize}px ${formatFontFamily(fontFamily, GENERIC_FONT_FAMILIES)}`;
  ctx.font = fontString;
  const textMetrics = ctx.measureText(char);
  const ascent = textMetrics.actualBoundingBoxAscent;
  const descent = textMetrics.actualBoundingBoxDescent;

  if (!Number.isFinite(ascent) || !Number.isFinite(descent)) {
    throw new Error("Worker text metrics missing ascent/descent.");
  }

  // Calculate canvas size
  const padding = scaledSize * 0.3;
  const width = Math.ceil(Math.max(textMetrics.width, scaledSize * 0.5) + padding * 2);
  const height = Math.ceil(ascent + descent + padding * 2);

  canvas.width = Math.min(width, 256);
  canvas.height = Math.min(height, 256);

  // Re-apply font after resize
  ctx.font = fontString;
  ctx.textBaseline = "alphabetic";

  // Render
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  const baselinePx = padding + ascent;
  ctx.fillText(char, padding, baselinePx);

  // Extract contours
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const rawContours = extractContours(imageData);
  const baselineOffset = (baselinePx - padding) / RENDER_SCALE;
  const paths = processContours(rawContours, RENDER_SCALE, padding).map((path) => ({
    ...path,
    points: path.points.map((point) => ({
      x: point.x,
      y: point.y - baselineOffset,
    })),
  }));

  // Calculate bounds
  const bounds = calculateBounds(paths);

  // Calculate metrics
  const metrics = {
    advanceWidth: textMetrics.width / RENDER_SCALE,
    leftBearing: (textMetrics.actualBoundingBoxLeft ?? 0) / RENDER_SCALE,
    ascent: ascent / RENDER_SCALE,
    descent: descent / RENDER_SCALE,
  };

  return { char, paths, bounds, metrics };
}

function createWhitespaceGlyph(
  char: string,
  fontFamily: string,
  style: GlyphStyleKey,
): GlyphContour {
  const canvas = new OffscreenCanvas(64, 64);
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Worker canvas context unavailable for whitespace metrics.");
  }

  const fontString = `${style.fontStyle} ${style.fontWeight} ${style.fontSize}px ${formatFontFamily(fontFamily, GENERIC_FONT_FAMILIES)}`;
  ctx.font = fontString;
  const metrics = ctx.measureText(char);
  const advanceWidth = char === "\t" ? metrics.width * 4 : metrics.width;

  return {
    char,
    paths: [],
    bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    metrics: { advanceWidth, leftBearing: 0, ascent: 0, descent: 0 },
  };
}

function calculateBounds(paths: GlyphContour["paths"]): GlyphContour["bounds"] {
  const allPoints = paths.flatMap((path) => path.points);

  if (allPoints.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  return allPoints.reduce(
    (acc, p) => ({
      minX: Math.min(acc.minX, p.x),
      minY: Math.min(acc.minY, p.y),
      maxX: Math.max(acc.maxX, p.x),
      maxY: Math.max(acc.maxY, p.y),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  );
}

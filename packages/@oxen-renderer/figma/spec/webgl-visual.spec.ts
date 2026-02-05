/**
 * @file WebGL visual regression test
 *
 * Compares WebGL-rendered output against SVG-rendered output from the same
 * SceneGraph. Detects tessellation regressions (e.g. broken glyph paths).
 *
 * Flow:
 *   .fig → SceneGraph → SVG (resvg rasterize) → "reference PNG"
 *                      → WebGL (Puppeteer canvas)  → "actual PNG"
 *   Compare with pixelmatch.
 *
 * Run:
 *   npx vitest run packages/@oxen-renderer/figma/spec/webgl-visual.spec.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Resvg } from "@resvg/resvg-js";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { createServer, type ViteDevServer } from "vite";
import puppeteer, { type Browser, type Page } from "puppeteer";
import {
  parseFigFile,
  buildNodeTree,
  findNodesByType,
  type FigBlob,
  type FigImage,
} from "@oxen/fig/parser";
import type { FigNode } from "@oxen/fig/types";
import { buildSceneGraph } from "../src/scene-graph/builder";
import { renderSceneGraphToSvg } from "../src/svg/scene-renderer";
import type { SceneGraph } from "../src/scene-graph/types";

// =============================================================================
// Paths
// =============================================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TWITTER_FIXTURES_DIR = path.join(__dirname, "../fixtures/twitter-ui");
const FIG_FILE = path.join(TWITTER_FIXTURES_DIR, "twitter_ui.fig");
const WEBGL_FIXTURES_DIR = path.join(__dirname, "../fixtures/webgl-visual");
const OUTPUT_DIR = path.join(WEBGL_FIXTURES_DIR, "__output__");
const DIFF_DIR = path.join(WEBGL_FIXTURES_DIR, "__diff__");
const BASELINE_DIR = path.join(WEBGL_FIXTURES_DIR, "baseline");

// =============================================================================
// Test Configuration
// =============================================================================

/** Frames to test (subset with text content for targeted comparison) */
const TEST_FRAMES = [
  "Twitter Home",
  "Twitter Profile (Tweets)",
  "Twitter Search",
  "Twitter Menu",
];

/** Maximum allowed diff between SVG and WebGL rendering */
const MAX_SVG_WEBGL_DIFF_PERCENT = 30;

/** Maximum allowed diff between WebGL baseline and current render */
const MAX_BASELINE_DIFF_PERCENT = 2;

// =============================================================================
// Types
// =============================================================================

type FrameInfo = {
  name: string;
  node: FigNode;
  width: number;
  height: number;
};

type CompareResult = {
  frameName: string;
  diffPercent: number;
  diffPixels: number;
  totalPixels: number;
};

// =============================================================================
// Utilities
// =============================================================================

function ensureDirs(): void {
  for (const dir of [OUTPUT_DIR, DIFF_DIR, BASELINE_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]/g, "_");
}

function svgToPng(svg: string, width?: number): Buffer {
  const opts: {
    fitTo?: { mode: "width"; value: number };
    font?: { loadSystemFonts: boolean };
    shapeRendering?: 0 | 1 | 2;
    textRendering?: 0 | 1 | 2;
  } = {
    font: { loadSystemFonts: true },
    shapeRendering: 2,
    textRendering: 2,
  };
  if (width !== undefined) {
    opts.fitTo = { mode: "width", value: width };
  }
  const resvg = new Resvg(svg, opts);
  const pngData = resvg.render();
  return Buffer.from(pngData.asPng());
}

function comparePngs(
  a: Buffer,
  b: Buffer,
  frameName: string,
  diffPath?: string,
): CompareResult {
  const imgA = PNG.sync.read(a);
  let imgB = PNG.sync.read(b);

  // Resize if dimensions don't match
  if (imgB.width !== imgA.width || imgB.height !== imgA.height) {
    const resized = new PNG({ width: imgA.width, height: imgA.height });
    for (let y = 0; y < imgA.height; y++) {
      const sy = Math.floor((y / imgA.height) * imgB.height);
      for (let x = 0; x < imgA.width; x++) {
        const sx = Math.floor((x / imgA.width) * imgB.width);
        const srcIdx = (sy * imgB.width + sx) * 4;
        const dstIdx = (y * imgA.width + x) * 4;
        resized.data[dstIdx] = imgB.data[srcIdx];
        resized.data[dstIdx + 1] = imgB.data[srcIdx + 1];
        resized.data[dstIdx + 2] = imgB.data[srcIdx + 2];
        resized.data[dstIdx + 3] = imgB.data[srcIdx + 3];
      }
    }
    imgB = resized;
  }

  const diff = new PNG({ width: imgA.width, height: imgA.height });
  const diffPixels = pixelmatch(
    imgA.data,
    imgB.data,
    diff.data,
    imgA.width,
    imgA.height,
    { threshold: 0.1, includeAA: false },
  );

  if (diffPath && diffPixels > 0) {
    fs.writeFileSync(diffPath, PNG.sync.write(diff));
  }

  const totalPixels = imgA.width * imgA.height;
  return {
    frameName,
    diffPercent: (diffPixels / totalPixels) * 100,
    diffPixels,
    totalPixels,
  };
}

/**
 * Normalize root frame transform to (0,0)
 */
function normalizeRootNode(node: FigNode): FigNode {
  const nodeData = node as Record<string, unknown>;
  const transform = nodeData.transform as
    | { m02?: number; m12?: number }
    | undefined;
  if (!transform) return node;
  return { ...node, transform: { ...transform, m02: 0, m12: 0 } } as FigNode;
}

// =============================================================================
// Data Loading
// =============================================================================

let cachedData: {
  frames: Map<string, FrameInfo>;
  blobs: readonly FigBlob[];
  images: ReadonlyMap<string, FigImage>;
  nodeMap: ReadonlyMap<string, FigNode>;
} | null = null;

async function loadFixtures() {
  if (cachedData) return cachedData;

  const data = fs.readFileSync(FIG_FILE);
  const parsed = await parseFigFile(new Uint8Array(data));
  const { roots, nodeMap } = buildNodeTree(parsed.nodeChanges);

  const twitterCanvas = findNodesByType(roots, "CANVAS").find(
    (c) => c.name === "Twitter",
  );
  if (!twitterCanvas) throw new Error("Twitter canvas not found");

  const frames = new Map<string, FrameInfo>();
  for (const child of twitterCanvas.children ?? []) {
    const name = child.name ?? "unnamed";
    const nodeData = child as Record<string, unknown>;
    const size = nodeData.size as { x?: number; y?: number } | undefined;
    frames.set(name, {
      name,
      node: child,
      width: size?.x ?? 100,
      height: size?.y ?? 100,
    });
  }

  cachedData = { frames, blobs: parsed.blobs, images: parsed.images, nodeMap };
  return cachedData;
}

function buildFrameSceneGraph(frame: FrameInfo, data: typeof cachedData & {}): SceneGraph {
  const normalizedNode = normalizeRootNode(frame.node);
  return buildSceneGraph([normalizedNode], {
    blobs: data.blobs,
    images: data.images,
    canvasSize: { width: frame.width, height: frame.height },
    symbolMap: data.nodeMap,
    showHiddenNodes: false,
  });
}

// =============================================================================
// WebGL Capture via Puppeteer
// =============================================================================

/**
 * JSON replacer that converts Uint8Array to `{ __base64: "..." }` for transport
 */
function uint8ArrayReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Uint8Array) {
    let binary = "";
    for (let i = 0; i < value.length; i++) {
      binary += String.fromCharCode(value[i]);
    }
    return { __base64: Buffer.from(value).toString("base64") };
  }
  return value;
}

async function captureWebGL(
  page: Page,
  sceneGraph: SceneGraph,
): Promise<Buffer> {
  const json = JSON.stringify(sceneGraph, uint8ArrayReplacer);

  const dataUrl = await page.evaluate(async (sgJson: string) => {
    return await window.renderSceneGraph(sgJson);
  }, json);

  // Convert data URL to Buffer
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  return Buffer.from(base64, "base64");
}

// =============================================================================
// Tests
// =============================================================================

describe("WebGL visual regression", () => {
  let server: ViteDevServer;
  let browser: Browser;
  let page: Page;
  let serverUrl: string;

  beforeAll(async () => {
    ensureDirs();

    // Start Vite dev server for the test harness
    server = await createServer({
      configFile: path.resolve(__dirname, "webgl-harness/vite.config.ts"),
      server: { port: 0, strictPort: false },
    });
    const info = await server.listen();
    const address = info.httpServer?.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to get server address");
    }
    serverUrl = `http://localhost:${address.port}`;

    // Launch headless browser
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    page = await browser.newPage();
    await page.goto(serverUrl, { waitUntil: "networkidle0" });

    // Wait for harness to be ready
    await page.waitForFunction(() => document.title === "ready", {
      timeout: 15000,
    });
  }, 30000);

  afterAll(async () => {
    await browser?.close();
    await server?.close();
  });

  it("loads fixtures and harness", async () => {
    const data = await loadFixtures();
    expect(data.frames.size).toBeGreaterThan(0);

    const title = await page.title();
    expect(title).toBe("ready");
  });

  describe("SVG vs WebGL cross-renderer comparison", () => {
    for (const frameName of TEST_FRAMES) {
      it(`renders "${frameName}" similarly to SVG`, async () => {
        const data = await loadFixtures();
        const frame = data.frames.get(frameName);
        if (!frame) {
          console.log(`SKIP: Frame "${frameName}" not found`);
          return;
        }

        const sceneGraph = buildFrameSceneGraph(frame, data);

        // SVG reference: render scene graph → SVG → rasterize
        const svgString = renderSceneGraphToSvg(sceneGraph) as string;
        const svgPng = svgToPng(svgString, frame.width);

        // WebGL actual: render via Puppeteer
        const webglPng = await captureWebGL(page, sceneGraph);

        // Save outputs
        const safe = safeName(frameName);
        fs.writeFileSync(path.join(OUTPUT_DIR, `${safe}-svg.png`), svgPng);
        fs.writeFileSync(path.join(OUTPUT_DIR, `${safe}-webgl.png`), webglPng);

        // Compare
        const result = comparePngs(
          svgPng,
          webglPng,
          frameName,
          path.join(DIFF_DIR, `${safe}-svg-vs-webgl.png`),
        );

        console.log(
          `  ${frameName}: SVG↔WebGL diff = ${result.diffPercent.toFixed(1)}%`,
        );
        expect(result.diffPercent).toBeLessThan(MAX_SVG_WEBGL_DIFF_PERCENT);
      }, 30000);
    }
  });

  describe("WebGL baseline regression", () => {
    for (const frameName of TEST_FRAMES) {
      it(`"${frameName}" matches baseline`, async () => {
        const data = await loadFixtures();
        const frame = data.frames.get(frameName);
        if (!frame) {
          console.log(`SKIP: Frame "${frameName}" not found`);
          return;
        }

        const sceneGraph = buildFrameSceneGraph(frame, data);
        const webglPng = await captureWebGL(page, sceneGraph);

        const safe = safeName(frameName);
        const baselinePath = path.join(BASELINE_DIR, `${safe}.png`);

        if (!fs.existsSync(baselinePath)) {
          // First run: save as baseline
          fs.writeFileSync(baselinePath, webglPng);
          console.log(`  ${frameName}: baseline created (${baselinePath})`);
          return;
        }

        // Compare against baseline
        const baseline = fs.readFileSync(baselinePath);
        const result = comparePngs(
          baseline,
          webglPng,
          frameName,
          path.join(DIFF_DIR, `${safe}-baseline-diff.png`),
        );

        console.log(
          `  ${frameName}: baseline diff = ${result.diffPercent.toFixed(2)}%`,
        );
        expect(result.diffPercent).toBeLessThan(MAX_BASELINE_DIFF_PERCENT);
      }, 30000);
    }
  });

  it("summary", async () => {
    const data = await loadFixtures();
    const results: CompareResult[] = [];

    for (const frameName of TEST_FRAMES) {
      const frame = data.frames.get(frameName);
      if (!frame) continue;

      const sceneGraph = buildFrameSceneGraph(frame, data);
      const svgString = renderSceneGraphToSvg(sceneGraph) as string;
      const svgPng = svgToPng(svgString, frame.width);
      const webglPng = await captureWebGL(page, sceneGraph);

      results.push(comparePngs(svgPng, webglPng, frameName));
    }

    const avgDiff =
      results.reduce((sum, r) => sum + r.diffPercent, 0) / results.length;

    console.log("\n=== WebGL Visual Regression Summary ===");
    for (const r of results) {
      console.log(`  ${r.frameName}: ${r.diffPercent.toFixed(1)}% diff`);
    }
    console.log(`  Average SVG↔WebGL diff: ${avgDiff.toFixed(1)}%`);
  }, 60000);
});

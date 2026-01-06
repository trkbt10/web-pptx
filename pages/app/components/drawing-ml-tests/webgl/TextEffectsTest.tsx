/**
 * @file WebGL Mode Text Effects Test
 *
 * Tests for ECMA-376 text effects rendered in WebGL mode using Three.js.
 * WebGL mode provides true 3D extrusion, materials, and lighting.
 *
 * @see ECMA-376 Part 1, Section 20.1.5 (3D Properties)
 * @see ECMA-376 Part 1, Section 21.1.2.1.28 (prstTxWarp)
 */

import { useState, useMemo } from "react";
import { type CheckItem, TestSubsection } from "../common";
import { Text3DRenderer, type Text3DRunConfig } from "@lib/pptx/render/webgl/text3d";
import type { PresetCameraType, PresetMaterialType, BevelPresetType } from "@lib/pptx/domain/three-d";
import { px, pt } from "@lib/pptx/domain/types";
import type { TextBody, Paragraph, RegularRun, RunProperties, ParagraphProperties } from "@lib/pptx/domain/text";
import type { SolidFill } from "@lib/pptx/domain/color";
import type { ColorContext } from "@lib/pptx/domain/resolution";
import { toLayoutInput, layoutTextBody } from "@lib/pptx/render/text-layout";
import { PT_TO_PX } from "@lib/pptx/domain/unit-conversion";

// =============================================================================
// TextBody Construction Helpers (ECMA-376 compliant)
// =============================================================================

/**
 * Create a SolidFill from hex color string.
 * @see ECMA-376 Part 1, Section 20.1.8.38 (solidFill)
 */
function createSolidFill(hex: string): SolidFill {
  return {
    type: "solid",
    color: { type: "srgb", value: hex.replace("#", "") },
  };
}

/**
 * Create RunProperties from simplified parameters.
 * @see ECMA-376 Part 1, Section 21.1.2.3.9 (a:rPr)
 */
function createRunProperties(options: {
  fontSize: number;
  fontFamily: string;
  bold?: boolean;
  italic?: boolean;
  color: string;
}): RunProperties {
  return {
    fontSize: pt(options.fontSize),
    latin: { typeface: options.fontFamily },
    bold: options.bold ?? false,
    italic: options.italic ?? false,
    fill: createSolidFill(options.color),
  };
}

/**
 * Create a RegularRun (a:r element).
 * @see ECMA-376 Part 1, Section 21.1.2.3.8 (a:r)
 */
function createTextRun(text: string, properties: RunProperties): RegularRun {
  return {
    type: "text",
    text,
    properties,
  };
}

/**
 * Create a Paragraph (a:p element).
 *
 * Per ECMA-376, a:pPr is optional. When omitted, defaults apply.
 * The domain type requires `properties` but all fields within are optional.
 *
 * @see ECMA-376 Part 1, Section 21.1.2.2.6 (a:p)
 * @see ECMA-376 Part 1, Section 21.1.2.2.7 (a:pPr) - "This element is optional"
 */
function createParagraph(runs: RegularRun[], properties?: ParagraphProperties): Paragraph {
  return {
    runs,
    properties: properties ?? {},
  };
}

/**
 * Create a TextBody (a:txBody element).
 * @see ECMA-376 Part 1, Section 21.1.2.1.2 (a:txBody)
 */
function createTextBody(paragraphs: Paragraph[]): TextBody {
  return {
    bodyProperties: {
      wrap: "square",
      anchor: "t",
    },
    paragraphs,
  };
}

/**
 * Minimal ColorContext for demo (no theme colors).
 */
const demoColorContext: ColorContext = {
  theme: {
    dk1: "000000",
    lt1: "FFFFFF",
    dk2: "1F497D",
    lt2: "EEECE1",
    accent1: "4F81BD",
    accent2: "C0504D",
    accent3: "9BBB59",
    accent4: "8064A2",
    accent5: "4BACC6",
    accent6: "F79646",
    hlink: "0000FF",
    folHlink: "800080",
  },
};

/**
 * Convert layout result to Text3DRunConfig array.
 * This is the proper ECMA-376 compliant flow.
 */
function layoutToText3DRuns(textBody: TextBody, width: number, height: number): Text3DRunConfig[] {
  const layoutInput = toLayoutInput({
    body: textBody,
    width: px(width),
    height: px(height),
    colorContext: demoColorContext,
    fontScheme: undefined,
    renderOptions: undefined,
    resourceResolver: () => undefined,
  });

  const layoutResult = layoutTextBody(layoutInput);
  const runs: Text3DRunConfig[] = [];

  for (const para of layoutResult.paragraphs) {
    for (const line of para.lines) {
      let cursorX = line.x as number;

      for (const span of line.spans) {
        if (span.text.length === 0 || span.isBreak) {
          continue;
        }

        const fontSizePx = px((span.fontSize as number) * PT_TO_PX);

        runs.push({
          text: span.text,
          color: span.color,
          fontSize: fontSizePx,
          fontFamily: span.fontFamily,
          fontWeight: span.fontWeight,
          fontStyle: span.fontStyle,
          x: px(cursorX),
          y: line.y,
          width: span.width,
        });

        cursorX += (span.width as number) + (span.dx as number);
      }
    }
  }

  return runs;
}

// =============================================================================
// Preset Lists
// =============================================================================

const cameraPresets: PresetCameraType[] = [
  "orthographicFront",
  "isometricTopUp",
  "isometricTopDown",
  "obliqueTop",
  "obliqueTopLeft",
  "perspectiveAbove",
  "perspectiveFront",
  "perspectiveLeft",
];

const materialPresets: PresetMaterialType[] = [
  "flat",
  "matte",
  "plastic",
  "metal",
  "softEdge",
  "warmMatte",
  "clear",
];

const bevelPresets: BevelPresetType[] = [
  "relaxedInset",
  "circle",
  "slope",
  "cross",
  "angle",
  "softRound",
  "convex",
];

// =============================================================================
// Text3DPreview Component
// =============================================================================

/**
 * Interactive 3D text preview component
 *
 * Demonstrates the Text3DRenderer with per-run styling support.
 * Uses proper ECMA-376 domain objects and layout engine.
 *
 * @see ECMA-376 Part 1, Section 21.1.2 (DrawingML - Text)
 */
function Text3DPreview() {
  const [camera, setCamera] = useState<PresetCameraType>("isometricTopUp");
  const [material, setMaterial] = useState<PresetMaterialType>("plastic");
  const [bevelPreset, setBevelPreset] = useState<BevelPresetType>("relaxedInset");
  const [extrusion, setExtrusion] = useState(20);
  const [text, setText] = useState("3D");
  const [showMixedStyles, setShowMixedStyles] = useState(false);

  // Create TextBody domain objects (ECMA-376 a:txBody)
  const singleRunTextBody: TextBody = useMemo(() => createTextBody([
    createParagraph([
      createTextRun(text, createRunProperties({
        fontSize: 48,
        fontFamily: "Arial",
        bold: true,
        color: "#4F81BD",
      })),
    ]),
  ]), [text]);

  // Mixed styles demo: multiple runs with different styles
  const mixedStylesTextBody: TextBody = useMemo(() => createTextBody([
    createParagraph([
      createTextRun("Multi", createRunProperties({
        fontSize: 36,
        fontFamily: "Arial",
        bold: true,
        color: "#C0504D",
      })),
      createTextRun("-", createRunProperties({
        fontSize: 36,
        fontFamily: "Arial",
        bold: false,
        color: "#000000",
      })),
      createTextRun("Style", createRunProperties({
        fontSize: 36,
        fontFamily: "Georgia",
        bold: false,
        italic: true,
        color: "#4F81BD",
      })),
      createTextRun("!", createRunProperties({
        fontSize: 48,
        fontFamily: "Impact",
        bold: true,
        color: "#9BBB59",
      })),
    ]),
  ]), []);

  // Run layout engine (ECMA-376 compliant)
  const runs = useMemo(() => {
    const textBody = showMixedStyles ? mixedStylesTextBody : singleRunTextBody;
    return layoutToText3DRuns(textBody, 400, 200);
  }, [showMixedStyles, singleRunTextBody, mixedStylesTextBody]);

  return (
    <div className="text3d-preview-container">
      <div className="text3d-controls">
        <label>
          <input
            type="checkbox"
            checked={showMixedStyles}
            onChange={(e) => setShowMixedStyles(e.target.checked)}
          />
          Show Mixed Styles (multi-run)
        </label>
        {!showMixedStyles && (
          <label>
            Text:
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value || "3D")}
              maxLength={10}
            />
          </label>
        )}
        <label>
          Camera:
          <select value={camera} onChange={(e) => setCamera(e.target.value as PresetCameraType)}>
            {cameraPresets.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        <label>
          Material:
          <select value={material} onChange={(e) => setMaterial(e.target.value as PresetMaterialType)}>
            {materialPresets.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        <label>
          Bevel:
          <select value={bevelPreset} onChange={(e) => setBevelPreset(e.target.value as BevelPresetType)}>
            {bevelPresets.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        <label>
          Extrusion: {extrusion}px
          <input
            type="range"
            min={0}
            max={50}
            value={extrusion}
            onChange={(e) => setExtrusion(Number(e.target.value))}
          />
        </label>
      </div>
      <div className="text3d-canvas" style={{ width: 400, height: 200, background: "#1a1a2e", borderRadius: 8 }}>
        <Text3DRenderer
          runs={runs}
          width={400}
          height={200}
          scene3d={{
            camera: { preset: camera },
            lightRig: { rig: "threePt", direction: "tl" },
          }}
          shape3d={{
            extrusionHeight: extrusion,
            preset: material,
            bevel: { width: 8, height: 8, preset: bevelPreset },
          }}
        />
      </div>
      {showMixedStyles && (
        <p className="pattern-info" style={{ marginTop: 8 }}>
          Mixed styles demo: "Multi" (red, bold), "-" (black, normal), "Style" (blue, Georgia italic), "!" (green, Impact).
          Each run is rendered as a separate 3D mesh with its own material.
        </p>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * WebGL Mode Text Effects Test
 *
 * Tests text rendering capabilities in WebGL mode:
 * - True 3D extrusion (ExtrudeGeometry)
 * - Material presets (MeshStandardMaterial)
 * - Bevel effects
 * - Camera presets (orthographic, perspective, isometric)
 * - Light rigs
 * - Per-run styling
 */
export function WebglTextEffectsTest() {
  // Text Fill items
  const textFillItems: CheckItem[] = [
    { label: "Solid fill (solidFill)", status: "pass", notes: "Three.js material color" },
    { label: "Gradient fill (gradFill)", status: "pending", notes: "Not yet implemented" },
    { label: "Pattern fill (pattFill)", status: "pending", notes: "Not yet implemented" },
    { label: "Image fill (blipFill)", status: "pending", notes: "Not yet implemented" },
  ];

  // Text Outline items
  const textOutlineItems: CheckItem[] = [
    { label: "Solid outline (ln)", status: "pending", notes: "Edge detection needed" },
    { label: "Outline width (w)", status: "pending", notes: "Not yet implemented" },
    { label: "Outline color", status: "pending", notes: "Not yet implemented" },
  ];

  // Text Effects items
  const textEffectItems: CheckItem[] = [
    { label: "Shadow (outerShdw)", status: "pending", notes: "Shadow map needed" },
    { label: "Glow (glow)", status: "pending", notes: "Post-processing needed" },
    { label: "Reflection (reflection)", status: "pending", notes: "Environment map needed" },
    { label: "Soft edge (softEdge)", status: "pending", notes: "Post-processing needed" },
  ];

  // 3D Properties items
  const text3dItems: CheckItem[] = [
    { label: "3D scene (scene3d)", status: "pass", notes: "Three.js camera presets" },
    { label: "3D shape (sp3d)", status: "pass", notes: "ExtrudeGeometry + materials" },
    { label: "Flat text (flatTx)", status: "pass", notes: "Z-offset positioning" },
    { label: "Bevel effects (bevel)", status: "pass", notes: "ExtrudeGeometry bevelEnabled" },
    { label: "Extrusion (extrusionH)", status: "pass", notes: "ExtrudeGeometry depth" },
    { label: "Material presets", status: "pass", notes: "MeshStandardMaterial variants" },
    { label: "Light rig (lightRig)", status: "pass", notes: "Three.js light presets" },
    { label: "Camera presets", status: "pass", notes: "Orthographic/Perspective cameras" },
    { label: "Per-run styling", status: "pass", notes: "Individual mesh per run" },
  ];

  return (
    <div className="test-section">
      <h3>WebGL Mode - Text Effects (3D)</h3>
      <p className="section-description">
        ECMA-376 text effects rendered using Three.js WebGL for true 3D rendering.
        <br />
        Requires WebGL support. Provides extrusion, materials, and lighting.
      </p>

      <TestSubsection title="Text Fill" items={textFillItems}>
        <p className="pattern-info">
          Material color from solidFill. Gradient/pattern/image fills not yet implemented in 3D materials.
        </p>
      </TestSubsection>

      <TestSubsection title="Text Outline" items={textOutlineItems}>
        <p className="pattern-info">
          3D outline requires edge detection or separate outline geometry. Not yet implemented.
        </p>
      </TestSubsection>

      <TestSubsection title="Text Effects" items={textEffectItems}>
        <p className="pattern-info">
          3D effects require post-processing passes (bloom, shadow maps, etc.). Not yet implemented.
        </p>
      </TestSubsection>

      <TestSubsection title="3D Properties (scene3d / sp3d)" items={text3dItems}>
        <Text3DPreview />
        <p className="pattern-info">
          True 3D rendering with Three.js ExtrudeGeometry.
          Supports ECMA-376 scene3d (camera, lightRig) and sp3d (extrusion, bevel, material presets).
        </p>
      </TestSubsection>
    </div>
  );
}

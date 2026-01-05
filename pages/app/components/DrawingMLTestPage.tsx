/**
 * @file DrawingML Test Page
 *
 * Comprehensive test page for DrawingML rendering features.
 * Serves as a visual checklist for all DrawingML capabilities.
 *
 * @see ECMA-376 Part 1, Section 20.1 - DrawingML
 */

import { useState, useMemo, type ReactNode } from "react";
import type { Fill, Line, PatternType, LineCap, DashStyle, GradientFill, SchemeColorValue } from "@lib/pptx/domain";
import type { Effects } from "@lib/pptx/domain/effects";
import type { Pixels } from "@lib/pptx/domain/types";
import { px, deg, pct } from "@lib/pptx/domain/types";
import { RenderProvider } from "@lib/pptx/render/react/context";
import { SvgDefsProvider } from "@lib/pptx/render/react/hooks/useSvgDefs";
import {
  ColorSwatch,
  ColorSwatchRow,
  useShapeStyle,
  getSupportedPatterns,
} from "@lib/pptx/render/react/drawing-ml";
import "./DrawingMLTestPage.css";

// =============================================================================
// Types
// =============================================================================

type DrawingMLTestPageProps = {
  readonly onBack: () => void;
};

type TestSection = "colors" | "fills" | "lines" | "effects" | "shapes" | "combined";

type CheckItem = {
  readonly label: string;
  readonly status: "pass" | "partial" | "pending";
  readonly notes?: string;
};

// =============================================================================
// Test Fixtures
// =============================================================================

const testSlideSize = {
  width: px(960) as Pixels,
  height: px(540) as Pixels,
};

const testColorContext = {
  colorScheme: {
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
  colorMap: {
    tx1: "dk1",
    tx2: "dk2",
    bg1: "lt1",
    bg2: "lt2",
  },
};

/**
 * Helper to create valid GradientFill objects
 */
function makeGradient(
  angleDeg: number,
  ...colors: Array<{ pos: number; color: string | { scheme: SchemeColorValue } }>
): GradientFill {
  function toColorSpec(c: string | { scheme: SchemeColorValue }) {
    if (typeof c === "string") {
      return { type: "srgb" as const, value: c };
    }
    return { type: "scheme" as const, value: c.scheme };
  }
  return {
    type: "gradientFill",
    stops: colors.map((c) => ({
      position: pct(c.pos),
      color: { spec: toColorSpec(c.color) },
    })),
    linear: { angle: deg(angleDeg), scaled: true },
    rotWithShape: true,
  };
}

// =============================================================================
// Shared Components
// =============================================================================

/**
 * Checkbox indicator for test coverage
 */
function CheckBox({ status }: { status: CheckItem["status"] }) {
  const colors = {
    pass: "#10b981",
    partial: "#f59e0b",
    pending: "#6b7280",
  };
  const icons = {
    pass: "✓",
    partial: "◐",
    pending: "○",
  };
  return (
    <span style={{ color: colors[status], marginRight: 8, fontFamily: "monospace" }}>
      {icons[status]}
    </span>
  );
}

/**
 * Subsection with checklist header
 */
function TestSubsection({
  title,
  items,
  children,
}: {
  title: string;
  items: CheckItem[];
  children: ReactNode;
}) {
  const passCount = items.filter((i) => i.status === "pass").length;
  return (
    <div className="test-subsection">
      <h4>
        {title}
        <span className="check-count">
          ({passCount}/{items.length})
        </span>
      </h4>
      <div className="check-list">
        {items.map((item, i) => (
          <div key={i} className="check-item">
            <CheckBox status={item.status} />
            <span>{item.label}</span>
            {item.notes && <span className="check-notes">({item.notes})</span>}
          </div>
        ))}
      </div>
      <div className="test-examples">{children}</div>
    </div>
  );
}

/**
 * Shape preview with fill
 */
function ShapePreview({ fill, label }: { fill: Fill; label: string }) {
  const style = useShapeStyle({ fill, width: 100, height: 60 });
  return (
    <div className="shape-preview">
      <svg width="100" height="60" viewBox="0 0 100 60">
        <defs>{style.defs}</defs>
        <rect x="5" y="5" width="90" height="50" rx="6" {...style.svgProps} />
      </svg>
      <span className="preview-label">{label}</span>
    </div>
  );
}

/**
 * Line preview with stroke styles
 */
function LinePreview({ line, label }: { line: Line; label: string }) {
  const style = useShapeStyle({
    fill: { type: "noFill" },
    line,
    width: 120,
    height: 40,
  });
  return (
    <div className="shape-preview">
      <svg width="120" height="40" viewBox="0 0 120 40">
        <defs>{style.defs}</defs>
        <line x1="10" y1="20" x2="110" y2="20" {...style.svgProps} />
      </svg>
      <span className="preview-label">{label}</span>
    </div>
  );
}

/**
 * Effect preview
 */
function EffectPreview({ effects, label }: { effects: Effects; label: string }) {
  const style = useShapeStyle({
    fill: { type: "solidFill", color: { spec: { type: "scheme", value: "accent1" } } },
    effects,
    width: 80,
    height: 50,
  });
  return (
    <div className="effect-preview">
      <svg width="100" height="70" viewBox="0 0 100 70">
        <defs>{style.defs}</defs>
        <rect x="15" y="15" width="70" height="40" rx="6" {...style.svgProps} />
      </svg>
      <span className="preview-label">{label}</span>
    </div>
  );
}

/**
 * Combined shape preview
 */
function CombinedPreview({
  fill,
  line,
  effects,
  label,
}: {
  fill: Fill;
  line?: Line;
  effects?: Effects;
  label: string;
}) {
  const style = useShapeStyle({ fill, line, effects, width: 120, height: 80 });
  return (
    <div className="combined-preview">
      <svg width="140" height="100" viewBox="0 0 140 100">
        <defs>{style.defs}</defs>
        <rect x="15" y="15" width="110" height="70" rx="8" {...style.svgProps} />
      </svg>
      <span className="preview-label">{label}</span>
    </div>
  );
}

/**
 * Geometry shape preview
 */
function GeometryPreview({
  shape,
  fill,
  label,
}: {
  shape: "rect" | "ellipse" | "roundRect" | "triangle" | "diamond";
  fill: Fill;
  label: string;
}) {
  const style = useShapeStyle({ fill, width: 80, height: 60 });

  const renderShape = () => {
    switch (shape) {
      case "rect":
        return <rect x="10" y="10" width="80" height="50" {...style.svgProps} />;
      case "ellipse":
        return <ellipse cx="50" cy="35" rx="40" ry="25" {...style.svgProps} />;
      case "roundRect":
        return <rect x="10" y="10" width="80" height="50" rx="12" {...style.svgProps} />;
      case "triangle":
        return <polygon points="50,5 95,60 5,60" {...style.svgProps} />;
      case "diamond":
        return <polygon points="50,5 95,35 50,65 5,35" {...style.svgProps} />;
    }
  };

  return (
    <div className="shape-preview">
      <svg width="100" height="70" viewBox="0 0 100 70">
        <defs>{style.defs}</defs>
        {renderShape()}
      </svg>
      <span className="preview-label">{label}</span>
    </div>
  );
}

// =============================================================================
// Color Section
// =============================================================================

function ColorTestSection() {
  const colorSpecItems: CheckItem[] = [
    { label: "sRGB (hex)", status: "pass" },
    { label: "Scheme colors", status: "pass" },
    { label: "Preset colors", status: "partial", notes: "basic support" },
    { label: "System colors", status: "pending" },
    { label: "HSL colors", status: "pending" },
  ];

  const colorTransformItems: CheckItem[] = [
    { label: "Alpha (transparency)", status: "pass" },
    { label: "Shade (darken)", status: "pass" },
    { label: "Tint (lighten)", status: "pass" },
    { label: "LumMod/LumOff", status: "pass" },
    { label: "SatMod/SatOff", status: "partial" },
    { label: "HueMod/HueOff", status: "pending" },
    { label: "Complement/Inverse", status: "pending" },
  ];

  return (
    <div className="test-section">
      <h3>Color System</h3>
      <p className="section-description">
        ECMA-376 color specifications and transforms.
      </p>

      <TestSubsection title="Color Specifications" items={colorSpecItems}>
        <div className="shape-row">
          <div className="color-item">
            <ColorSwatch color={{ spec: { type: "srgb", value: "FF0000" } }} size={48} showInfo />
            <span className="color-label">sRGB Red</span>
          </div>
          <div className="color-item">
            <ColorSwatch color={{ spec: { type: "srgb", value: "00FF00" } }} size={48} showInfo />
            <span className="color-label">sRGB Green</span>
          </div>
          <div className="color-item">
            <ColorSwatch color={{ spec: { type: "srgb", value: "0000FF" } }} size={48} showInfo />
            <span className="color-label">sRGB Blue</span>
          </div>
          <div className="color-item">
            <ColorSwatch color={{ spec: { type: "scheme", value: "accent1" } }} size={48} showInfo />
            <span className="color-label">Scheme accent1</span>
          </div>
          <div className="color-item">
            <ColorSwatch color={{ spec: { type: "preset", value: "coral" } }} size={48} showInfo />
            <span className="color-label">Preset coral</span>
          </div>
        </div>
      </TestSubsection>

      <TestSubsection title="Color Transforms" items={colorTransformItems}>
        <div className="shape-row">
          <div className="color-item">
            <ColorSwatch
              color={{ spec: { type: "srgb", value: "4F81BD" }, transform: { alpha: pct(50) } }}
              size={48}
              showInfo
            />
            <span className="color-label">50% Alpha</span>
          </div>
          <div className="color-item">
            <ColorSwatch
              color={{ spec: { type: "srgb", value: "FF0000" }, transform: { shade: pct(50) } }}
              size={48}
              showInfo
            />
            <span className="color-label">50% Shade</span>
          </div>
          <div className="color-item">
            <ColorSwatch
              color={{ spec: { type: "srgb", value: "0000FF" }, transform: { tint: pct(50) } }}
              size={48}
              showInfo
            />
            <span className="color-label">50% Tint</span>
          </div>
          <div className="color-item">
            <ColorSwatch
              color={{ spec: { type: "scheme", value: "accent1" }, transform: { lumMod: pct(75), lumOff: pct(25) } }}
              size={48}
              showInfo
            />
            <span className="color-label">LumMod 75%</span>
          </div>
        </div>
      </TestSubsection>

      <TestSubsection
        title="Color Scheme (12 slots)"
        items={[{ label: "Full scheme support", status: "pass" }]}
      >
        <div className="scheme-row">
          <ColorSwatchRow
            colors={[
              { spec: { type: "scheme", value: "dk1" } },
              { spec: { type: "scheme", value: "lt1" } },
              { spec: { type: "scheme", value: "dk2" } },
              { spec: { type: "scheme", value: "lt2" } },
              { spec: { type: "scheme", value: "accent1" } },
              { spec: { type: "scheme", value: "accent2" } },
              { spec: { type: "scheme", value: "accent3" } },
              { spec: { type: "scheme", value: "accent4" } },
              { spec: { type: "scheme", value: "accent5" } },
              { spec: { type: "scheme", value: "accent6" } },
              { spec: { type: "scheme", value: "hlink" } },
              { spec: { type: "scheme", value: "folHlink" } },
            ]}
            labels={["dk1", "lt1", "dk2", "lt2", "ac1", "ac2", "ac3", "ac4", "ac5", "ac6", "hlink", "folHlink"]}
            size={32}
          />
        </div>
      </TestSubsection>
    </div>
  );
}

// =============================================================================
// Fill Section
// =============================================================================

function FillTestSection() {
  const supportedPatterns = useMemo(() => getSupportedPatterns(), []);

  const fillTypeItems: CheckItem[] = [
    { label: "NoFill", status: "pass" },
    { label: "SolidFill", status: "pass" },
    { label: "GradientFill (linear)", status: "pass" },
    { label: "GradientFill (radial)", status: "pass" },
    { label: "PatternFill", status: "pass", notes: `${supportedPatterns.length} patterns` },
    { label: "BlipFill (image)", status: "partial", notes: "dataURL only" },
    { label: "GroupFill", status: "pending" },
  ];

  const gradientItems: CheckItem[] = [
    { label: "2-stop gradient", status: "pass" },
    { label: "Multi-stop gradient", status: "pass" },
    { label: "Angle rotation", status: "pass" },
    { label: "Radial (path) gradient", status: "pass" },
    { label: "TileRect", status: "pending" },
  ];

  return (
    <div className="test-section">
      <h3>Fill Types</h3>
      <p className="section-description">
        ECMA-376 Section 20.1.8 - Fill properties for shapes.
      </p>

      <TestSubsection title="Fill Types" items={fillTypeItems}>
        <div className="shape-row">
          <ShapePreview fill={{ type: "noFill" }} label="NoFill" />
          <ShapePreview
            fill={{ type: "solidFill", color: { spec: { type: "scheme", value: "accent1" } } }}
            label="Solid"
          />
          <ShapePreview
            fill={makeGradient(90, { pos: 0, color: "FF0000" }, { pos: 100, color: "0000FF" })}
            label="Linear Grad"
          />
          <ShapePreview
            fill={{
              type: "patternFill",
              preset: "smGrid" as PatternType,
              foregroundColor: { spec: { type: "srgb", value: "4F81BD" } },
              backgroundColor: { spec: { type: "srgb", value: "FFFFFF" } },
            }}
            label="Pattern"
          />
        </div>
      </TestSubsection>

      <TestSubsection title="Gradient Variations" items={gradientItems}>
        <div className="shape-row">
          <ShapePreview
            fill={makeGradient(0, { pos: 0, color: { scheme: "accent1" } }, { pos: 100, color: { scheme: "accent2" } })}
            label="0° (→)"
          />
          <ShapePreview
            fill={makeGradient(45, { pos: 0, color: { scheme: "accent3" } }, { pos: 100, color: { scheme: "accent4" } })}
            label="45° (↘)"
          />
          <ShapePreview
            fill={makeGradient(90, { pos: 0, color: { scheme: "accent5" } }, { pos: 100, color: { scheme: "accent6" } })}
            label="90° (↓)"
          />
          <ShapePreview
            fill={makeGradient(
              135,
              { pos: 0, color: "FFFFFF" },
              { pos: 50, color: { scheme: "accent1" } },
              { pos: 100, color: "000000" },
            )}
            label="3-stop 135°"
          />
        </div>
      </TestSubsection>

      <TestSubsection
        title={`Pattern Fills (${supportedPatterns.length} types)`}
        items={[
          { label: "Grid patterns", status: "pass" },
          { label: "Diagonal patterns", status: "pass" },
          { label: "Percentage patterns", status: "pass" },
          { label: "Specialty patterns", status: "partial" },
        ]}
      >
        <div className="shape-row">
          <ShapePreview
            fill={{
              type: "patternFill",
              preset: "smGrid" as PatternType,
              foregroundColor: { spec: { type: "srgb", value: "4F81BD" } },
              backgroundColor: { spec: { type: "srgb", value: "FFFFFF" } },
            }}
            label="smGrid"
          />
          <ShapePreview
            fill={{
              type: "patternFill",
              preset: "ltUpDiag" as PatternType,
              foregroundColor: { spec: { type: "scheme", value: "accent2" } },
              backgroundColor: { spec: { type: "srgb", value: "FFFFFF" } },
            }}
            label="ltUpDiag"
          />
          <ShapePreview
            fill={{
              type: "patternFill",
              preset: "pct25" as PatternType,
              foregroundColor: { spec: { type: "srgb", value: "000000" } },
              backgroundColor: { spec: { type: "scheme", value: "accent1" } },
            }}
            label="pct25"
          />
          <ShapePreview
            fill={{
              type: "patternFill",
              preset: "horzBrick" as PatternType,
              foregroundColor: { spec: { type: "srgb", value: "8B4513" } },
              backgroundColor: { spec: { type: "srgb", value: "F4E4D4" } },
            }}
            label="horzBrick"
          />
          <ShapePreview
            fill={{
              type: "patternFill",
              preset: "diagCross" as PatternType,
              foregroundColor: { spec: { type: "scheme", value: "accent3" } },
              backgroundColor: { spec: { type: "srgb", value: "FFFFFF" } },
            }}
            label="diagCross"
          />
        </div>
        <div className="pattern-names">
          {supportedPatterns.join(", ")}
        </div>
      </TestSubsection>
    </div>
  );
}

// =============================================================================
// Line Section
// =============================================================================

function LineTestSection() {
  const capJoinItems: CheckItem[] = [
    { label: "LineCap: flat", status: "pass" },
    { label: "LineCap: round", status: "pass" },
    { label: "LineCap: square", status: "pass" },
    { label: "LineJoin: miter", status: "pass" },
    { label: "LineJoin: round", status: "pass" },
    { label: "LineJoin: bevel", status: "pass" },
  ];

  const dashItems: CheckItem[] = [
    { label: "solid", status: "pass" },
    { label: "dot", status: "pass" },
    { label: "dash", status: "pass" },
    { label: "lgDash", status: "pass" },
    { label: "dashDot", status: "pass" },
    { label: "lgDashDot", status: "pass" },
    { label: "lgDashDotDot", status: "pass" },
    { label: "Custom dash", status: "partial" },
  ];

  const compoundItems: CheckItem[] = [
    { label: "Single (sng)", status: "pass" },
    { label: "Double (dbl)", status: "pending" },
    { label: "ThickThin", status: "pending" },
    { label: "ThinThick", status: "pending" },
    { label: "Triple (tri)", status: "pending" },
  ];

  const baseLine = (overrides: Partial<Line>): Line => ({
    fill: { type: "solidFill", color: { spec: { type: "scheme", value: "dk1" } } },
    width: px(3),
    compound: "sng",
    alignment: "ctr",
    cap: "flat",
    dash: "solid",
    join: "round",
    ...overrides,
  });

  return (
    <div className="test-section">
      <h3>Line/Stroke Styles</h3>
      <p className="section-description">
        ECMA-376 Section 20.1.8.36 - Line properties (a:ln).
      </p>

      <TestSubsection title="Line Width" items={[{ label: "Width scaling", status: "pass" }]}>
        <div className="shape-row">
          <LinePreview line={baseLine({ width: px(1) })} label="1px" />
          <LinePreview line={baseLine({ width: px(2) })} label="2px" />
          <LinePreview line={baseLine({ width: px(4) })} label="4px" />
          <LinePreview line={baseLine({ width: px(8) })} label="8px" />
        </div>
      </TestSubsection>

      <TestSubsection title="Line Cap & Join" items={capJoinItems}>
        <div className="shape-row">
          <LinePreview line={baseLine({ cap: "flat" as LineCap, width: px(6) })} label="cap: flat" />
          <LinePreview line={baseLine({ cap: "round" as LineCap, width: px(6) })} label="cap: round" />
          <LinePreview line={baseLine({ cap: "square" as LineCap, width: px(6) })} label="cap: square" />
        </div>
      </TestSubsection>

      <TestSubsection title="Dash Patterns" items={dashItems}>
        <div className="shape-row">
          <LinePreview line={baseLine({ dash: "solid" as DashStyle })} label="solid" />
          <LinePreview line={baseLine({ dash: "dot" as DashStyle })} label="dot" />
          <LinePreview line={baseLine({ dash: "dash" as DashStyle })} label="dash" />
          <LinePreview line={baseLine({ dash: "lgDash" as DashStyle })} label="lgDash" />
          <LinePreview line={baseLine({ dash: "dashDot" as DashStyle })} label="dashDot" />
          <LinePreview line={baseLine({ dash: "lgDashDot" as DashStyle })} label="lgDashDot" />
        </div>
      </TestSubsection>

      <TestSubsection title="Compound Lines" items={compoundItems}>
        <div className="shape-row">
          <LinePreview line={baseLine({ compound: "sng", width: px(4) })} label="single" />
        </div>
        <p className="pattern-info">Double/Triple compound lines require additional implementation</p>
      </TestSubsection>

      <TestSubsection
        title="Stroke Color"
        items={[{ label: "Solid stroke color", status: "pass" }]}
      >
        <div className="shape-row">
          <LinePreview
            line={baseLine({
              fill: { type: "solidFill", color: { spec: { type: "scheme", value: "accent1" } } },
              width: px(4),
            })}
            label="accent1"
          />
          <LinePreview
            line={baseLine({
              fill: { type: "solidFill", color: { spec: { type: "scheme", value: "accent2" } } },
              width: px(4),
            })}
            label="accent2"
          />
          <LinePreview
            line={baseLine({
              fill: {
                type: "solidFill",
                color: { spec: { type: "srgb", value: "000000" }, transform: { alpha: pct(50) } },
              },
              width: px(4),
            })}
            label="50% alpha"
          />
        </div>
      </TestSubsection>
    </div>
  );
}

// =============================================================================
// Effects Section
// =============================================================================

function EffectsTestSection() {
  const shadowItems: CheckItem[] = [
    { label: "Outer shadow", status: "pass" },
    { label: "Inner shadow", status: "pass" },
    { label: "Shadow direction", status: "pass" },
    { label: "Shadow blur", status: "pass" },
    { label: "Shadow distance", status: "pass" },
    { label: "Preset shadows (1-20)", status: "pending" },
  ];

  const otherEffectItems: CheckItem[] = [
    { label: "Glow effect", status: "pass" },
    { label: "Soft edge", status: "pass" },
    { label: "Reflection", status: "pending" },
    { label: "Alpha effects", status: "pending" },
    { label: "Color effects", status: "pending" },
  ];

  return (
    <div className="test-section">
      <h3>Effects</h3>
      <p className="section-description">
        ECMA-376 Section 20.1.8 - Effect containers and filter rendering.
      </p>

      <TestSubsection title="Shadow Effects" items={shadowItems}>
        <div className="effects-row">
          <EffectPreview
            effects={{
              shadow: {
                type: "outer",
                color: { spec: { type: "srgb", value: "000000" }, transform: { alpha: pct(50) } },
                blurRadius: px(8),
                distance: px(4),
                direction: deg(45),
              },
            }}
            label="Outer 45°"
          />
          <EffectPreview
            effects={{
              shadow: {
                type: "outer",
                color: { spec: { type: "srgb", value: "000000" }, transform: { alpha: pct(40) } },
                blurRadius: px(6),
                distance: px(4),
                direction: deg(135),
              },
            }}
            label="Outer 135°"
          />
          <EffectPreview
            effects={{
              shadow: {
                type: "inner",
                color: { spec: { type: "srgb", value: "000000" }, transform: { alpha: pct(60) } },
                blurRadius: px(6),
                distance: px(3),
                direction: deg(225),
              },
            }}
            label="Inner"
          />
          <EffectPreview
            effects={{
              shadow: {
                type: "outer",
                color: { spec: { type: "srgb", value: "000000" }, transform: { alpha: pct(30) } },
                blurRadius: px(16),
                distance: px(6),
                direction: deg(90),
              },
            }}
            label="Large Blur"
          />
        </div>
      </TestSubsection>

      <TestSubsection title="Glow & Soft Edge" items={otherEffectItems}>
        <div className="effects-row">
          <EffectPreview
            effects={{
              glow: {
                color: { spec: { type: "srgb", value: "FFD700" }, transform: { alpha: pct(75) } },
                radius: px(10),
              },
            }}
            label="Gold Glow"
          />
          <EffectPreview
            effects={{
              glow: {
                color: { spec: { type: "scheme", value: "accent1" }, transform: { alpha: pct(60) } },
                radius: px(8),
              },
            }}
            label="Accent Glow"
          />
          <EffectPreview
            effects={{
              softEdge: { radius: px(8) },
            }}
            label="Soft Edge"
          />
          <EffectPreview
            effects={{
              softEdge: { radius: px(16) },
            }}
            label="Large Soft"
          />
        </div>
      </TestSubsection>

      <TestSubsection
        title="Combined Effects"
        items={[{ label: "Multiple effects", status: "pass" }]}
      >
        <div className="effects-row">
          <EffectPreview
            effects={{
              shadow: {
                type: "outer",
                color: { spec: { type: "srgb", value: "000000" }, transform: { alpha: pct(40) } },
                blurRadius: px(6),
                distance: px(3),
                direction: deg(45),
              },
              glow: {
                color: { spec: { type: "scheme", value: "accent1" }, transform: { alpha: pct(50) } },
                radius: px(6),
              },
            }}
            label="Shadow + Glow"
          />
        </div>
      </TestSubsection>
    </div>
  );
}

// =============================================================================
// Shapes Section
// =============================================================================

function ShapesTestSection() {
  const geometryItems: CheckItem[] = [
    { label: "Rectangle", status: "pass" },
    { label: "Rounded Rectangle", status: "pass" },
    { label: "Ellipse", status: "pass" },
    { label: "Triangle", status: "pass" },
    { label: "Diamond", status: "pass" },
    { label: "Preset geometries (150+)", status: "partial" },
    { label: "Custom geometry paths", status: "partial" },
  ];

  const transformItems: CheckItem[] = [
    { label: "Position (x, y)", status: "pass" },
    { label: "Size (w, h)", status: "pass" },
    { label: "Rotation", status: "pass" },
    { label: "Flip H/V", status: "pass" },
  ];

  const accentFill: Fill = { type: "solidFill", color: { spec: { type: "scheme", value: "accent1" } } };

  return (
    <div className="test-section">
      <h3>Shapes & Geometry</h3>
      <p className="section-description">
        ECMA-376 Section 20.1.9 - Shape geometries and transforms.
      </p>

      <TestSubsection title="Basic Geometries" items={geometryItems}>
        <div className="shape-row">
          <GeometryPreview shape="rect" fill={accentFill} label="Rectangle" />
          <GeometryPreview shape="roundRect" fill={accentFill} label="Rounded Rect" />
          <GeometryPreview shape="ellipse" fill={accentFill} label="Ellipse" />
          <GeometryPreview shape="triangle" fill={accentFill} label="Triangle" />
          <GeometryPreview shape="diamond" fill={accentFill} label="Diamond" />
        </div>
      </TestSubsection>

      <TestSubsection title="Transform Properties" items={transformItems}>
        <p className="pattern-info">Transforms are applied during shape rendering in context</p>
      </TestSubsection>
    </div>
  );
}

// =============================================================================
// Combined Section
// =============================================================================

function CombinedTestSection() {
  return (
    <div className="test-section">
      <h3>Combined Styles</h3>
      <p className="section-description">
        Integration tests combining fill + stroke + effects.
      </p>

      <div className="combined-row">
        <CombinedPreview
          fill={{ type: "solidFill", color: { spec: { type: "scheme", value: "accent1" } } }}
          line={{
            fill: { type: "solidFill", color: { spec: { type: "srgb", value: "1F497D" } } },
            width: px(3),
            compound: "sng",
            alignment: "ctr",
            cap: "flat",
            dash: "solid",
            join: "round",
          }}
          effects={{
            shadow: {
              type: "outer",
              color: { spec: { type: "srgb", value: "000000" }, transform: { alpha: pct(40) } },
              blurRadius: px(6),
              distance: px(3),
              direction: deg(45),
            },
          }}
          label="Solid + Stroke + Shadow"
        />
        <CombinedPreview
          fill={makeGradient(135, { pos: 0, color: { scheme: "accent3" } }, { pos: 100, color: { scheme: "accent4" } })}
          line={{
            fill: { type: "solidFill", color: { spec: { type: "scheme", value: "accent4" } } },
            width: px(2),
            compound: "sng",
            alignment: "ctr",
            cap: "round",
            dash: "dash",
            join: "round",
          }}
          effects={{
            glow: {
              color: { spec: { type: "scheme", value: "accent4" }, transform: { alpha: pct(60) } },
              radius: px(8),
            },
          }}
          label="Gradient + Dashed + Glow"
        />
        <CombinedPreview
          fill={{
            type: "patternFill",
            preset: "ltUpDiag" as PatternType,
            foregroundColor: { spec: { type: "scheme", value: "accent2" } },
            backgroundColor: { spec: { type: "srgb", value: "FFFFFF" } },
          }}
          line={{
            fill: { type: "solidFill", color: { spec: { type: "scheme", value: "accent2" } } },
            width: px(2),
            compound: "sng",
            alignment: "ctr",
            cap: "flat",
            dash: "solid",
            join: "miter",
          }}
          label="Pattern + Solid Stroke"
        />
        <CombinedPreview
          fill={{ type: "solidFill", color: { spec: { type: "scheme", value: "accent5" } } }}
          effects={{
            shadow: {
              type: "outer",
              color: { spec: { type: "srgb", value: "000000" }, transform: { alpha: pct(30) } },
              blurRadius: px(12),
              distance: px(4),
              direction: deg(90),
            },
            softEdge: { radius: px(4) },
          }}
          label="Solid + Shadow + Soft"
        />
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * DrawingML Test Page component.
 */
export function DrawingMLTestPage({ onBack }: DrawingMLTestPageProps) {
  const [activeSection, setActiveSection] = useState<TestSection>("colors");

  const sections: { id: TestSection; label: string }[] = [
    { id: "colors", label: "Colors" },
    { id: "fills", label: "Fills" },
    { id: "lines", label: "Lines" },
    { id: "effects", label: "Effects" },
    { id: "shapes", label: "Shapes" },
    { id: "combined", label: "Combined" },
  ];

  return (
    <RenderProvider slideSize={testSlideSize} colorContext={testColorContext}>
      <SvgDefsProvider>
        <div className="drawingml-test-page">
          <header className="test-header">
            <button className="back-button" onClick={onBack}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span>Back</span>
            </button>
            <h1 className="test-title">DrawingML Coverage Checklist</h1>
          </header>

          <nav className="test-nav">
            {sections.map((section) => (
              <button
                key={section.id}
                className={`nav-button ${activeSection === section.id ? "active" : ""}`}
                onClick={() => setActiveSection(section.id)}
              >
                {section.label}
              </button>
            ))}
          </nav>

          <main className="test-content">
            {activeSection === "colors" && <ColorTestSection />}
            {activeSection === "fills" && <FillTestSection />}
            {activeSection === "lines" && <LineTestSection />}
            {activeSection === "effects" && <EffectsTestSection />}
            {activeSection === "shapes" && <ShapesTestSection />}
            {activeSection === "combined" && <CombinedTestSection />}
          </main>
        </div>
      </SvgDefsProvider>
    </RenderProvider>
  );
}

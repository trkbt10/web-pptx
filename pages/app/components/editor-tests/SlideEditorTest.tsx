/**
 * @file Slide Editor Test
 *
 * Test component for the Phase 2 SlideEditor with interactive canvas.
 * Includes all shape types: SpShape, PicShape, CxnShape, GrpShape, GraphicFrame (table).
 */

import { useState, useMemo, type CSSProperties } from "react";
import { SlideEditor } from "@lib/pptx-editor";
import type { Slide } from "@lib/pptx/domain/slide";
import type {
  SpShape,
  PicShape,
  CxnShape,
  GrpShape,
  GraphicFrame,
} from "@lib/pptx/domain/shape";
import type { Table, TableRow, TableCell } from "@lib/pptx/domain/table";
import { px, deg } from "@lib/pptx/domain/types";
import { createRenderContext } from "@lib/pptx/render/context";

// =============================================================================
// SpShape Fixture
// =============================================================================

const createTestSpShape = (
  id: string,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fillColor: string,
  rotation = 0
): SpShape => ({
  type: "sp",
  nonVisual: {
    id,
    name,
    description: `Test shape: ${name}`,
  },
  properties: {
    transform: {
      x: px(x),
      y: px(y),
      width: px(width),
      height: px(height),
      rotation: deg(rotation),
      flipH: false,
      flipV: false,
    },
    fill: {
      type: "solidFill",
      color: {
        spec: {
          type: "srgb",
          value: fillColor,
        },
      },
    },
    line: {
      width: px(2),
      fill: {
        type: "solidFill",
        color: {
          spec: {
            type: "srgb",
            value: "333333",
          },
        },
      },
    },
    geometry: {
      type: "preset",
      preset: "rect",
      adjustValues: [],
    },
  },
});

// =============================================================================
// CxnShape Fixture (Connector)
// =============================================================================

const createTestCxnShape = (
  id: string,
  name: string,
  x: number,
  y: number,
  width: number
): CxnShape => ({
  type: "cxnSp",
  nonVisual: {
    id,
    name,
  },
  properties: {
    transform: {
      x: px(x),
      y: px(y),
      width: px(width),
      height: px(0),
      rotation: deg(0),
      flipH: false,
      flipV: false,
    },
    geometry: {
      type: "preset",
      preset: "line",
      adjustValues: [],
    },
    line: {
      width: px(2),
      fill: {
        type: "solidFill",
        color: {
          spec: {
            type: "srgb",
            value: "000000",
          },
        },
      },
    },
  },
});

// =============================================================================
// GraphicFrame (Table) Fixture
// =============================================================================

const createTestTableCell = (text: string): TableCell => ({
  textBody: {
    bodyProperties: {},
    paragraphs: [
      {
        runs: [
          {
            type: "text",
            text,
            properties: {},
          },
        ],
        properties: {},
        endProperties: {},
      },
    ],
  },
  properties: {},
});

const createTestTableRow = (cells: string[]): TableRow => ({
  height: px(30),
  cells: cells.map(createTestTableCell),
});

const createTestTable = (): Table => ({
  grid: {
    columns: [{ width: px(80) }, { width: px(80) }, { width: px(80) }],
  },
  rows: [
    createTestTableRow(["Header 1", "Header 2", "Header 3"]),
    createTestTableRow(["A1", "B1", "C1"]),
    createTestTableRow(["A2", "B2", "C2"]),
  ],
  properties: {},
});

const createTestTableFrame = (
  id: string,
  name: string,
  x: number,
  y: number
): GraphicFrame => ({
  type: "graphicFrame",
  nonVisual: {
    id,
    name,
  },
  transform: {
    x: px(x),
    y: px(y),
    width: px(240),
    height: px(120),
    rotation: deg(0),
    flipH: false,
    flipV: false,
  },
  content: {
    type: "table",
    data: {
      table: createTestTable(),
    },
  },
});

// =============================================================================
// Test Slide with Multiple Shape Types
// =============================================================================

const createTestSlide = (): Slide => ({
  shapes: [
    // SpShapes (auto shapes)
    createTestSpShape("sp1", "Blue Rectangle", 100, 50, 180, 100, "4A90D9"),
    createTestSpShape("sp2", "Red Rectangle", 320, 50, 150, 120, "D94A4A"),
    createTestSpShape("sp3", "Green Rectangle", 100, 180, 200, 80, "4AD97A", 15),

    // CxnShape (connector line)
    createTestCxnShape("cxn1", "Connector", 510, 100, 120),

    // GraphicFrame (table)
    createTestTableFrame("tbl1", "Sample Table", 320, 200),
  ],
});

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "24px",
};

const headerStyle: CSSProperties = {
  padding: "16px 20px",
  backgroundColor: "var(--bg-secondary)",
  borderRadius: "12px",
  border: "1px solid var(--border-subtle)",
};

const titleStyle: CSSProperties = {
  fontSize: "18px",
  fontWeight: 600,
  marginBottom: "8px",
};

const descriptionStyle: CSSProperties = {
  fontSize: "14px",
  color: "var(--text-secondary)",
  lineHeight: 1.5,
};

const editorContainerStyle: CSSProperties = {
  height: "600px",
  backgroundColor: "var(--bg-secondary)",
  borderRadius: "12px",
  border: "1px solid var(--border-subtle)",
  padding: "16px",
};

const infoStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "16px",
};

const infoPanelStyle: CSSProperties = {
  padding: "16px",
  backgroundColor: "var(--bg-secondary)",
  borderRadius: "12px",
  border: "1px solid var(--border-subtle)",
};

const infoTitleStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  marginBottom: "12px",
  color: "var(--text-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const shortcutListStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  fontSize: "13px",
};

const shortcutItemStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const kbdStyle: CSSProperties = {
  padding: "2px 6px",
  backgroundColor: "var(--bg-tertiary)",
  borderRadius: "4px",
  fontSize: "12px",
  fontFamily: "var(--font-mono)",
  border: "1px solid var(--border-subtle)",
};

const valueDisplayStyle: CSSProperties = {
  padding: "12px",
  backgroundColor: "var(--bg-tertiary)",
  borderRadius: "8px",
  fontSize: "11px",
  fontFamily: "var(--font-mono)",
  color: "var(--text-tertiary)",
  whiteSpace: "pre-wrap",
  wordBreak: "break-all",
  maxHeight: "200px",
  overflow: "auto",
};

// =============================================================================
// Components
// =============================================================================

function ShortcutItem({ keys, description }: { keys: string; description: string }) {
  return (
    <div style={shortcutItemStyle}>
      <span style={{ color: "var(--text-secondary)" }}>{description}</span>
      <kbd style={kbdStyle}>{keys}</kbd>
    </div>
  );
}

/**
 * Slide editor test component
 */
export function SlideEditorTest() {
  const [slide, setSlide] = useState<Slide>(createTestSlide);

  // Create render context for integrated SVG rendering
  const renderContext = useMemo(() => createRenderContext({
    slideSize: {
      width: px(960),
      height: px(540),
    },
  }), []);

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h2 style={titleStyle}>Slide Editor (Phase 2)</h2>
        <p style={descriptionStyle}>
          Interactive slide editor with shape selection, drag-to-move, resize, rotate,
          and property editing. Click shapes to select, drag to move, use handles to
          resize or rotate.
        </p>
      </div>

      {/* Editor */}
      <div style={editorContainerStyle}>
        <SlideEditor
          value={slide}
          onChange={setSlide}
          width={px(960)}
          height={px(540)}
          renderContext={renderContext}
          showPropertyPanel
          showToolbar
          propertyPanelPosition="right"
        />
      </div>

      {/* Info Panels */}
      <div style={infoStyle}>
        {/* Keyboard Shortcuts */}
        <div style={infoPanelStyle}>
          <h3 style={infoTitleStyle}>Keyboard Shortcuts</h3>
          <div style={shortcutListStyle}>
            <ShortcutItem keys="Delete" description="Delete selected" />
            <ShortcutItem keys="Ctrl+C" description="Copy" />
            <ShortcutItem keys="Ctrl+V" description="Paste" />
            <ShortcutItem keys="Ctrl+X" description="Cut" />
            <ShortcutItem keys="Ctrl+Z" description="Undo" />
            <ShortcutItem keys="Ctrl+Y" description="Redo" />
            <ShortcutItem keys="Ctrl+A" description="Select all" />
            <ShortcutItem keys="Ctrl+D" description="Duplicate" />
            <ShortcutItem keys="Arrow" description="Nudge (1px)" />
            <ShortcutItem keys="Shift+Arrow" description="Nudge (10px)" />
            <ShortcutItem keys="Escape" description="Clear selection" />
          </div>
        </div>

        {/* Current State */}
        <div style={infoPanelStyle}>
          <h3 style={infoTitleStyle}>Current Slide State</h3>
          <div style={valueDisplayStyle}>
            {JSON.stringify(
              {
                shapeCount: slide.shapes.length,
                shapes: slide.shapes.map((s) => ({
                  id: s.nonVisual.id,
                  name: s.nonVisual.name,
                  type: s.type,
                  transform: "properties" in s ? s.properties.transform : undefined,
                })),
              },
              null,
              2
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

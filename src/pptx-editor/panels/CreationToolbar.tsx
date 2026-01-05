/**
 * @file Creation toolbar component
 *
 * Toolbar for creating new shapes, text boxes, and other elements.
 * Uses lucide-react icons for consistent visual design.
 */

import { useCallback, type CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import type { CreationMode } from "../presentation/types";
import { ToolbarButton } from "../ui/toolbar/index";
import {
  SelectIcon,
  RectIcon,
  RoundRectIcon,
  EllipseIcon,
  TriangleIcon,
  RightArrowIcon,
  TextBoxIcon,
  LineIcon,
} from "../ui/icons/index";
import { colorTokens, radiusTokens } from "../ui/design-tokens/index";

// =============================================================================
// Types
// =============================================================================

export type CreationToolbarProps = {
  /** Current creation mode */
  readonly mode: CreationMode;
  /** Called when mode changes */
  readonly onModeChange: (mode: CreationMode) => void;
  /** Disabled state */
  readonly disabled?: boolean;
  /** Visual style */
  readonly appearance?: "panel" | "floating";
};

type ToolDefinition = {
  readonly id: string;
  readonly icon: LucideIcon;
  readonly label: string;
  readonly mode: CreationMode;
};

// =============================================================================
// Styles
// =============================================================================

const toolbarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "2px",
  padding: "4px",
  backgroundColor: `var(--bg-secondary, ${colorTokens.background.secondary})`,
  borderRadius: radiusTokens.md,
  border: `1px solid var(--border-strong, ${colorTokens.border.strong})`,
};

const floatingToolbarStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "2px",
  padding: "6px",
  backgroundColor: `var(--bg-secondary, ${colorTokens.background.secondary})`,
  borderRadius: radiusTokens.lg,
  border: `1px solid var(--border-strong, ${colorTokens.border.strong})`,
  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
};

const separatorStyle: CSSProperties = {
  width: "1px",
  height: "24px",
  backgroundColor: `var(--border-strong, ${colorTokens.border.strong})`,
  margin: "0 4px",
};

const groupStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
};

// =============================================================================
// Tool Definitions
// =============================================================================

const TOOLS: readonly ToolDefinition[] = [
  // Selection
  {
    id: "select",
    icon: SelectIcon,
    label: "Select (V)",
    mode: { type: "select" },
  },
  // Basic shapes
  {
    id: "rect",
    icon: RectIcon,
    label: "Rectangle (R)",
    mode: { type: "shape", preset: "rect" },
  },
  {
    id: "roundRect",
    icon: RoundRectIcon,
    label: "Rounded Rectangle",
    mode: { type: "shape", preset: "roundRect" },
  },
  {
    id: "ellipse",
    icon: EllipseIcon,
    label: "Ellipse (O)",
    mode: { type: "shape", preset: "ellipse" },
  },
  {
    id: "triangle",
    icon: TriangleIcon,
    label: "Triangle",
    mode: { type: "shape", preset: "triangle" },
  },
  // Arrows
  {
    id: "rightArrow",
    icon: RightArrowIcon,
    label: "Right Arrow",
    mode: { type: "shape", preset: "rightArrow" },
  },
  // Text
  {
    id: "textbox",
    icon: TextBoxIcon,
    label: "Text Box (T)",
    mode: { type: "textbox" },
  },
  // Connector
  {
    id: "connector",
    icon: LineIcon,
    label: "Line (L)",
    mode: { type: "connector" },
  },
];

// Group tools by category for separators
const TOOL_GROUPS: readonly (readonly ToolDefinition[])[] = [
  TOOLS.slice(0, 1), // Select
  TOOLS.slice(1, 5), // Basic shapes
  TOOLS.slice(5, 6), // Arrows
  TOOLS.slice(6, 7), // Text
  TOOLS.slice(7, 8), // Connector
];

// =============================================================================
// Helper Functions
// =============================================================================

function isSameMode(a: CreationMode, b: CreationMode): boolean {
  if (a.type !== b.type) {
    return false;
  }
  if (a.type === "shape" && b.type === "shape") {
    return a.preset === b.preset;
  }
  if (a.type === "table" && b.type === "table") {
    return a.rows === b.rows && a.cols === b.cols;
  }
  return true;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Toolbar for creating new shapes and elements
 */
export function CreationToolbar({
  mode,
  onModeChange,
  disabled = false,
  appearance = "panel",
}: CreationToolbarProps) {
  const handleClick = useCallback(
    (toolMode: CreationMode) => {
      if (!disabled) {
        onModeChange(toolMode);
      }
    },
    [disabled, onModeChange]
  );

  const appliedStyle = appearance === "floating" ? floatingToolbarStyle : toolbarStyle;

  return (
    <div style={appliedStyle}>
      {TOOL_GROUPS.map((group, groupIndex) => (
        <div key={groupIndex} style={groupStyle}>
          {groupIndex > 0 && <div style={separatorStyle} />}
          {group.map((tool) => {
            const isActive = isSameMode(mode, tool.mode);
            return (
              <ToolbarButton
                key={tool.id}
                icon={tool.icon}
                label={tool.label}
                active={isActive}
                disabled={disabled}
                onClick={() => handleClick(tool.mode)}
                size="lg"
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

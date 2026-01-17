/**
 * @file TableCellPropertiesEditor - Editor for DOCX table cell properties
 *
 * Provides UI controls for editing cell-level properties like
 * width, vertical alignment, borders, and shading.
 */

import { useCallback, type CSSProperties } from "react";
import type { DocxTableCellProperties } from "../../../docx/domain/table";
import type { TableCellVerticalAlignment } from "../../../ooxml/domain/table";
import type { EditorProps } from "../../types";

// =============================================================================
// Types
// =============================================================================

export type TableCellPropertiesEditorProps = EditorProps<DocxTableCellProperties> & {
  readonly style?: CSSProperties;
  /** Show border controls */
  readonly showBorders?: boolean;
  /** Show shading controls */
  readonly showShading?: boolean;
};

// =============================================================================
// Constants
// =============================================================================

const VERTICAL_ALIGNMENT_OPTIONS: { value: TableCellVerticalAlignment; label: string }[] = [
  { value: "top", label: "Top" },
  { value: "center", label: "Middle" },
  { value: "bottom", label: "Bottom" },
];

const TEXT_DIRECTION_OPTIONS: {
  value: NonNullable<DocxTableCellProperties["textDirection"]>;
  label: string;
}[] = [
  { value: "lrTb", label: "Horizontal" },
  { value: "tbRl", label: "Vertical (Top to Bottom)" },
  { value: "btLr", label: "Vertical (Bottom to Top)" },
];

// =============================================================================
// Component
// =============================================================================

/**
 * Editor component for DOCX table cell properties.
 */
export function TableCellPropertiesEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  showBorders: _showBorders = true,
  showShading = true,
}: TableCellPropertiesEditorProps) {
  void _showBorders; // Reserved for future border controls
  const handleVerticalAlignmentChange = useCallback(
    (vAlign: TableCellVerticalAlignment) => {
      onChange({ ...value, vAlign });
    },
    [value, onChange],
  );

  const handleTextDirectionChange = useCallback(
    (textDirection: DocxTableCellProperties["textDirection"]) => {
      onChange({ ...value, textDirection });
    },
    [value, onChange],
  );

  const handleNoWrapChange = useCallback(
    (noWrap: boolean) => {
      onChange({ ...value, noWrap });
    },
    [value, onChange],
  );

  const handleWidthChange = useCallback(
    (widthValue: number, widthType: "auto" | "dxa" | "nil" | "pct") => {
      onChange({
        ...value,
        tcW: { value: widthValue, type: widthType },
      });
    },
    [value, onChange],
  );

  const handleShadingColorChange = useCallback(
    (color: string) => {
      onChange({
        ...value,
        shd: {
          ...value.shd,
          fill: color || undefined,
        },
      });
    },
    [value, onChange],
  );

  const widthValue = value.tcW?.value ?? 0;
  const widthType = value.tcW?.type ?? "auto";

  return (
    <div className={className} style={style}>
      {/* Cell Width */}
      <div className="cell-properties-width">
        <label>Cell Width</label>
        <div className="width-inputs">
          <input
            type="number"
            value={widthValue}
            onChange={(e) => handleWidthChange(Number(e.target.value), widthType)}
            disabled={disabled}
            min={0}
          />
          <select
            value={widthType}
            onChange={(e) =>
              handleWidthChange(widthValue, e.target.value as typeof widthType)
            }
            disabled={disabled}
          >
            <option value="auto">Auto</option>
            <option value="dxa">Twips</option>
            <option value="pct">Percent</option>
            <option value="nil">None</option>
          </select>
        </div>
      </div>

      {/* Vertical Alignment */}
      <div className="cell-properties-alignment">
        <label>Vertical Alignment</label>
        <div className="alignment-buttons">
          {VERTICAL_ALIGNMENT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleVerticalAlignmentChange(option.value)}
              disabled={disabled}
              aria-pressed={value.vAlign === option.value}
              title={option.label}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Text Direction */}
      <div className="cell-properties-direction">
        <label>Text Direction</label>
        <select
          value={value.textDirection ?? "lrTb"}
          onChange={(e) =>
            handleTextDirectionChange(
              e.target.value as DocxTableCellProperties["textDirection"],
            )
          }
          disabled={disabled}
        >
          {TEXT_DIRECTION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* No Wrap */}
      <div className="cell-properties-wrap">
        <label>
          <input
            type="checkbox"
            checked={value.noWrap ?? false}
            onChange={(e) => handleNoWrapChange(e.target.checked)}
            disabled={disabled}
          />
          No text wrapping
        </label>
      </div>

      {/* Shading */}
      {showShading && (
        <div className="cell-properties-shading">
          <label>Background Color</label>
          <input
            type="color"
            value={value.shd?.fill ? `#${value.shd.fill}` : "#ffffff"}
            onChange={(e) => handleShadingColorChange(e.target.value.slice(1))}
            disabled={disabled}
          />
          <button
            type="button"
            onClick={() => handleShadingColorChange("")}
            disabled={disabled}
            title="Clear background color"
          >
            Clear
          </button>
        </div>
      )}

      {/* Grid Span */}
      <div className="cell-properties-span">
        <label>Column Span</label>
        <input
          type="number"
          value={value.gridSpan ?? 1}
          onChange={(e) => {
            const span = Number(e.target.value);
            if (span <= 1) {
              const { gridSpan: _removed, ...rest } = value;
              void _removed;
              onChange(rest);
            } else {
              onChange({ ...value, gridSpan: span as typeof value.gridSpan });
            }
          }}
          disabled={disabled}
          min={1}
        />
      </div>
    </div>
  );
}

/**
 * Create default TableCellProperties value.
 */
export function createDefaultTableCellProperties(): DocxTableCellProperties {
  return {};
}

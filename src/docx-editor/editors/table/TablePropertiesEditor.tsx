/**
 * @file TablePropertiesEditor - Editor for DOCX table properties
 *
 * Provides UI controls for editing table-level properties like
 * width, alignment, borders, and cell spacing.
 */

import { useCallback, type CSSProperties } from "react";
import type {
  DocxTableProperties,
  DocxTableLook,
} from "../../../docx/domain/table";
import type { TableAlignment, TableLayoutType, TableWidth } from "../../../ooxml/domain/table";
import type { EditorProps } from "../../types";

// =============================================================================
// Types
// =============================================================================

export type TablePropertiesEditorProps = EditorProps<DocxTableProperties> & {
  readonly style?: CSSProperties;
  /** Show border controls */
  readonly showBorders?: boolean;
  /** Show style band options */
  readonly showStyleBands?: boolean;
};

// =============================================================================
// Constants
// =============================================================================

const ALIGNMENT_OPTIONS: { value: TableAlignment; label: string }[] = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];

const LAYOUT_OPTIONS: { value: TableLayoutType; label: string }[] = [
  { value: "autofit", label: "Auto Fit" },
  { value: "fixed", label: "Fixed" },
];

// =============================================================================
// Component
// =============================================================================

/**
 * Editor component for DOCX table properties.
 */
export function TablePropertiesEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  showBorders: _showBorders = true,
  showStyleBands = true,
}: TablePropertiesEditorProps) {
  void _showBorders; // Reserved for future border controls
  const handleWidthChange = useCallback(
    (width: TableWidth | undefined) => {
      onChange({ ...value, tblW: width });
    },
    [value, onChange],
  );

  const handleAlignmentChange = useCallback(
    (jc: TableAlignment) => {
      onChange({ ...value, jc });
    },
    [value, onChange],
  );

  const handleLayoutChange = useCallback(
    (layout: TableLayoutType) => {
      onChange({ ...value, tblLayout: layout });
    },
    [value, onChange],
  );

  const handleLookChange = useCallback(
    (look: Partial<DocxTableLook>) => {
      onChange({
        ...value,
        tblLook: { ...value.tblLook, ...look },
      });
    },
    [value, onChange],
  );

  const widthValue = value.tblW?.value ?? 0;
  const widthType = value.tblW?.type ?? "auto";

  return (
    <div className={className} style={style}>
      {/* Table Width */}
      <div className="table-properties-width">
        <label>Table Width</label>
        <div className="width-inputs">
          <input
            type="number"
            value={widthValue}
            onChange={(e) =>
              handleWidthChange({
                value: Number(e.target.value),
                type: widthType,
              })
            }
            disabled={disabled}
            min={0}
          />
          <select
            value={widthType}
            onChange={(e) =>
              handleWidthChange({
                value: widthValue,
                type: e.target.value as TableWidth["type"],
              })
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

      {/* Table Alignment */}
      <div className="table-properties-alignment">
        <label>Alignment</label>
        <div className="alignment-buttons">
          {ALIGNMENT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleAlignmentChange(option.value)}
              disabled={disabled}
              aria-pressed={value.jc === option.value}
              title={option.label}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table Layout */}
      <div className="table-properties-layout">
        <label>Layout</label>
        <select
          value={value.tblLayout ?? "autofit"}
          onChange={(e) => handleLayoutChange(e.target.value as TableLayoutType)}
          disabled={disabled}
        >
          {LAYOUT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Style Bands */}
      {showStyleBands && (
        <div className="table-properties-look">
          <label>Style Options</label>
          <div className="look-checkboxes">
            <label>
              <input
                type="checkbox"
                checked={value.tblLook?.firstRow ?? false}
                onChange={(e) => handleLookChange({ firstRow: e.target.checked })}
                disabled={disabled}
              />
              Header Row
            </label>
            <label>
              <input
                type="checkbox"
                checked={value.tblLook?.lastRow ?? false}
                onChange={(e) => handleLookChange({ lastRow: e.target.checked })}
                disabled={disabled}
              />
              Total Row
            </label>
            <label>
              <input
                type="checkbox"
                checked={value.tblLook?.firstColumn ?? false}
                onChange={(e) => handleLookChange({ firstColumn: e.target.checked })}
                disabled={disabled}
              />
              First Column
            </label>
            <label>
              <input
                type="checkbox"
                checked={value.tblLook?.lastColumn ?? false}
                onChange={(e) => handleLookChange({ lastColumn: e.target.checked })}
                disabled={disabled}
              />
              Last Column
            </label>
            <label>
              <input
                type="checkbox"
                checked={!(value.tblLook?.noHBand ?? false)}
                onChange={(e) => handleLookChange({ noHBand: !e.target.checked })}
                disabled={disabled}
              />
              Banded Rows
            </label>
            <label>
              <input
                type="checkbox"
                checked={!(value.tblLook?.noVBand ?? true)}
                onChange={(e) => handleLookChange({ noVBand: !e.target.checked })}
                disabled={disabled}
              />
              Banded Columns
            </label>
          </div>
        </div>
      )}

      {/* Caption and Description */}
      <div className="table-properties-accessibility">
        <label>Caption</label>
        <input
          type="text"
          value={value.tblCaption ?? ""}
          onChange={(e) => onChange({ ...value, tblCaption: e.target.value || undefined })}
          disabled={disabled}
          placeholder="Table caption"
        />
        <label>Description</label>
        <textarea
          value={value.tblDescription ?? ""}
          onChange={(e) =>
            onChange({ ...value, tblDescription: e.target.value || undefined })
          }
          disabled={disabled}
          placeholder="Table description for accessibility"
        />
      </div>
    </div>
  );
}

/**
 * Create default TableProperties value.
 */
export function createDefaultTableProperties(): DocxTableProperties {
  return {
    tblW: { value: 5000, type: "pct" },
    tblLayout: "autofit",
  };
}

/**
 * @file ParagraphPropertiesEditor - Editor for DOCX paragraph properties
 *
 * Provides UI controls for editing paragraph formatting properties like
 * alignment, indentation, spacing, and list numbering.
 */

import { useCallback, type CSSProperties } from "react";
import type {
  DocxParagraphProperties,
  DocxParagraphSpacing,
  DocxParagraphIndent,
  DocxOutlineLevel,
} from "../../../docx/domain/paragraph";
import type { ParagraphAlignment } from "../../../ooxml/domain/text";
import type { Twips } from "../../../docx/domain/types";
import type { EditorProps } from "../../types";

// =============================================================================
// Types
// =============================================================================

export type ParagraphPropertiesEditorProps = EditorProps<DocxParagraphProperties> & {
  readonly style?: CSSProperties;
  /** Show indentation controls */
  readonly showIndentation?: boolean;
  /** Show spacing controls */
  readonly showSpacing?: boolean;
  /** Show list numbering controls */
  readonly showNumbering?: boolean;
};

// =============================================================================
// Constants
// =============================================================================

const JUSTIFICATION_OPTIONS: { value: ParagraphAlignment; label: string }[] = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
  { value: "both", label: "Justify" },
];

// =============================================================================
// Component
// =============================================================================

/**
 * Editor component for DOCX paragraph properties.
 */
export function ParagraphPropertiesEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  showIndentation = true,
  showSpacing = true,
  showNumbering: _showNumbering = true,
}: ParagraphPropertiesEditorProps) {
  void _showNumbering; // Reserved for future numbering controls
  const handleAlignmentChange = useCallback(
    (jc: ParagraphAlignment) => {
      onChange({ ...value, jc });
    },
    [value, onChange],
  );

  const handleSpacingChange = useCallback(
    (spacing: Partial<DocxParagraphSpacing>) => {
      onChange({
        ...value,
        spacing: { ...value.spacing, ...spacing },
      });
    },
    [value, onChange],
  );

  const handleIndentationChange = useCallback(
    (ind: Partial<DocxParagraphIndent>) => {
      onChange({
        ...value,
        ind: { ...value.ind, ...ind },
      });
    },
    [value, onChange],
  );

  const handleOutlineLevelChange = useCallback(
    (level: number | undefined) => {
      if (level === undefined) {
        const { outlineLvl: _removed, ...rest } = value;
        void _removed;
        onChange(rest);
      } else {
        onChange({ ...value, outlineLvl: level as DocxOutlineLevel });
      }
    },
    [value, onChange],
  );

  const handleKeepNextChange = useCallback(
    (keepNext: boolean) => {
      onChange({ ...value, keepNext });
    },
    [value, onChange],
  );

  const handleKeepLinesChange = useCallback(
    (keepLines: boolean) => {
      onChange({ ...value, keepLines });
    },
    [value, onChange],
  );

  const handlePageBreakBeforeChange = useCallback(
    (pageBreakBefore: boolean) => {
      onChange({ ...value, pageBreakBefore });
    },
    [value, onChange],
  );

  const spacingBeforeInTwips = value.spacing?.before ?? 0;
  const spacingAfterInTwips = value.spacing?.after ?? 0;
  const lineSpacingValue = value.spacing?.line ?? 240;

  const indentLeftInTwips = value.ind?.left ?? 0;
  const indentRightInTwips = value.ind?.right ?? 0;
  const indentFirstLineInTwips = value.ind?.firstLine ?? value.ind?.hanging ?? 0;
  const isHangingIndent = value.ind?.hanging !== undefined;

  return (
    <div className={className} style={style}>
      {/* Alignment */}
      <div className="paragraph-properties-alignment">
        <label>Alignment</label>
        <div className="alignment-buttons">
          {JUSTIFICATION_OPTIONS.map((option) => (
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

      {/* Indentation */}
      {showIndentation && (
        <div className="paragraph-properties-indentation">
          <label>Indentation</label>
          <div className="indentation-inputs">
            <div>
              <label>Left (twips)</label>
              <input
                type="number"
                value={indentLeftInTwips}
                onChange={(e) =>
                  handleIndentationChange({ left: Number(e.target.value) as Twips })
                }
                disabled={disabled}
                min={0}
              />
            </div>
            <div>
              <label>Right (twips)</label>
              <input
                type="number"
                value={indentRightInTwips}
                onChange={(e) =>
                  handleIndentationChange({ right: Number(e.target.value) as Twips })
                }
                disabled={disabled}
                min={0}
              />
            </div>
            <div>
              <label>{isHangingIndent ? "Hanging" : "First Line"} (twips)</label>
              <input
                type="number"
                value={indentFirstLineInTwips}
                onChange={(e) => {
                  const val = Number(e.target.value) as Twips;
                  if (isHangingIndent) {
                    handleIndentationChange({ hanging: val, firstLine: undefined });
                  } else {
                    handleIndentationChange({ firstLine: val, hanging: undefined });
                  }
                }}
                disabled={disabled}
              />
              <button
                type="button"
                onClick={() => {
                  const val = indentFirstLineInTwips as Twips;
                  if (isHangingIndent) {
                    handleIndentationChange({ firstLine: val, hanging: undefined });
                  } else {
                    handleIndentationChange({ hanging: val, firstLine: undefined });
                  }
                }}
                disabled={disabled}
                title="Toggle between First Line and Hanging indent"
              >
                Toggle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spacing */}
      {showSpacing && (
        <div className="paragraph-properties-spacing">
          <label>Spacing</label>
          <div className="spacing-inputs">
            <div>
              <label>Before (twips)</label>
              <input
                type="number"
                value={spacingBeforeInTwips}
                onChange={(e) =>
                  handleSpacingChange({ before: Number(e.target.value) as Twips })
                }
                disabled={disabled}
                min={0}
              />
            </div>
            <div>
              <label>After (twips)</label>
              <input
                type="number"
                value={spacingAfterInTwips}
                onChange={(e) =>
                  handleSpacingChange({ after: Number(e.target.value) as Twips })
                }
                disabled={disabled}
                min={0}
              />
            </div>
            <div>
              <label>Line (twips, 240=single)</label>
              <input
                type="number"
                value={lineSpacingValue}
                onChange={(e) =>
                  handleSpacingChange({ line: Number(e.target.value) as Twips })
                }
                disabled={disabled}
                min={1}
              />
            </div>
          </div>
        </div>
      )}

      {/* Outline Level / Heading */}
      <div className="paragraph-properties-outline">
        <label>Outline Level</label>
        <select
          value={value.outlineLvl ?? ""}
          onChange={(e) =>
            handleOutlineLevelChange(
              e.target.value === "" ? undefined : Number(e.target.value),
            )
          }
          disabled={disabled}
        >
          <option value="">Body Text</option>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((level) => (
            <option key={level} value={level}>
              Heading {level + 1}
            </option>
          ))}
        </select>
      </div>

      {/* Page break options */}
      <div className="paragraph-properties-breaks">
        <label>
          <input
            type="checkbox"
            checked={value.keepNext ?? false}
            onChange={(e) => handleKeepNextChange(e.target.checked)}
            disabled={disabled}
          />
          Keep with next
        </label>
        <label>
          <input
            type="checkbox"
            checked={value.keepLines ?? false}
            onChange={(e) => handleKeepLinesChange(e.target.checked)}
            disabled={disabled}
          />
          Keep lines together
        </label>
        <label>
          <input
            type="checkbox"
            checked={value.pageBreakBefore ?? false}
            onChange={(e) => handlePageBreakBeforeChange(e.target.checked)}
            disabled={disabled}
          />
          Page break before
        </label>
      </div>
    </div>
  );
}

/**
 * Create default ParagraphProperties value.
 */
export function createDefaultParagraphProperties(): DocxParagraphProperties {
  return {};
}

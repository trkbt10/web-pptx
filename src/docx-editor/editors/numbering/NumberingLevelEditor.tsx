/**
 * @file NumberingLevelEditor - Editor for DOCX numbering level definitions
 *
 * Provides UI controls for editing numbering level properties like
 * format, start value, text pattern, and justification.
 */

import { useCallback, type CSSProperties } from "react";
import type { DocxLevel, DocxLevelJustification } from "../../../docx/domain/numbering";
import type { NumberFormat, LevelSuffix } from "../../../ooxml";
import type { DocxIlvl } from "../../../docx/domain/types";
import type { EditorProps } from "../../types";

// =============================================================================
// Types
// =============================================================================

export type NumberingLevelEditorProps = EditorProps<DocxLevel> & {
  readonly style?: CSSProperties;
  /** Show paragraph properties */
  readonly showParagraphProps?: boolean;
  /** Show run properties */
  readonly showRunProps?: boolean;
};

// =============================================================================
// Constants
// =============================================================================

const NUMBER_FORMAT_OPTIONS: { value: NumberFormat; label: string }[] = [
  { value: "decimal", label: "1, 2, 3..." },
  { value: "lowerRoman", label: "i, ii, iii..." },
  { value: "upperRoman", label: "I, II, III..." },
  { value: "lowerLetter", label: "a, b, c..." },
  { value: "upperLetter", label: "A, B, C..." },
  { value: "bullet", label: "Bullet" },
  { value: "none", label: "None" },
  { value: "ordinal", label: "1st, 2nd, 3rd..." },
  { value: "cardinalText", label: "One, Two, Three..." },
  { value: "ordinalText", label: "First, Second, Third..." },
];

const JUSTIFICATION_OPTIONS: { value: DocxLevelJustification; label: string }[] = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];

const SUFFIX_OPTIONS: { value: LevelSuffix; label: string }[] = [
  { value: "tab", label: "Tab" },
  { value: "space", label: "Space" },
  { value: "nothing", label: "Nothing" },
];

// =============================================================================
// Component
// =============================================================================

/**
 * Editor component for DOCX numbering level definitions.
 */
export function NumberingLevelEditor({
  value,
  onChange,
  disabled,
  className,
  style,
}: NumberingLevelEditorProps) {
  const handleStartChange = useCallback(
    (start: number | undefined) => {
      if (start === undefined) {
        const { start: _removed, ...rest } = value;
        void _removed;
        onChange(rest);
      } else {
        onChange({ ...value, start });
      }
    },
    [value, onChange],
  );

  const handleFormatChange = useCallback(
    (numFmt: NumberFormat) => {
      onChange({ ...value, numFmt });
    },
    [value, onChange],
  );

  const handleTextChange = useCallback(
    (text: string) => {
      onChange({
        ...value,
        lvlText: { val: text },
      });
    },
    [value, onChange],
  );

  const handleJustificationChange = useCallback(
    (lvlJc: DocxLevelJustification) => {
      onChange({ ...value, lvlJc });
    },
    [value, onChange],
  );

  const handleSuffixChange = useCallback(
    (suff: LevelSuffix) => {
      onChange({ ...value, suff });
    },
    [value, onChange],
  );

  const handleRestartChange = useCallback(
    (lvlRestart: number | undefined) => {
      if (lvlRestart === undefined) {
        const { lvlRestart: _removed, ...rest } = value;
        void _removed;
        onChange(rest);
      } else {
        onChange({ ...value, lvlRestart });
      }
    },
    [value, onChange],
  );

  const handleLegalChange = useCallback(
    (isLgl: boolean) => {
      if (isLgl) {
        onChange({ ...value, isLgl: true });
      } else {
        const { isLgl: _removed, ...rest } = value;
        void _removed;
        onChange(rest);
      }
    },
    [value, onChange],
  );

  return (
    <div className={className} style={style}>
      {/* Level Index (display only) */}
      <div className="numbering-level-index">
        <label>Level</label>
        <span>{value.ilvl + 1}</span>
      </div>

      {/* Number Format */}
      <div className="numbering-level-format">
        <label>Format</label>
        <select
          value={value.numFmt ?? "decimal"}
          onChange={(e) => handleFormatChange(e.target.value as NumberFormat)}
          disabled={disabled}
        >
          {NUMBER_FORMAT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Start Value */}
      <div className="numbering-level-start">
        <label>Start At</label>
        <input
          type="number"
          value={value.start ?? 1}
          onChange={(e) => handleStartChange(Number(e.target.value))}
          disabled={disabled}
          min={1}
        />
      </div>

      {/* Level Text */}
      <div className="numbering-level-text">
        <label>Number Text Pattern</label>
        <input
          type="text"
          value={value.lvlText?.val ?? ""}
          onChange={(e) => handleTextChange(e.target.value)}
          disabled={disabled}
          placeholder="%1."
        />
        <small>Use %1, %2, etc. for level numbers</small>
      </div>

      {/* Justification */}
      <div className="numbering-level-justification">
        <label>Justification</label>
        <div className="justification-buttons">
          {JUSTIFICATION_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleJustificationChange(option.value)}
              disabled={disabled}
              aria-pressed={value.lvlJc === option.value}
              title={option.label}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Suffix */}
      <div className="numbering-level-suffix">
        <label>Follow Number With</label>
        <select
          value={value.suff ?? "tab"}
          onChange={(e) => handleSuffixChange(e.target.value as LevelSuffix)}
          disabled={disabled}
        >
          {SUFFIX_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Restart Level */}
      <div className="numbering-level-restart">
        <label>Restart After Level</label>
        <select
          value={value.lvlRestart ?? ""}
          onChange={(e) =>
            handleRestartChange(e.target.value === "" ? undefined : Number(e.target.value))
          }
          disabled={disabled}
        >
          <option value="">Auto</option>
          {Array.from({ length: value.ilvl }, (_, i) => (
            <option key={i} value={i}>
              Level {i + 1}
            </option>
          ))}
        </select>
      </div>

      {/* Legal Format */}
      <div className="numbering-level-legal">
        <label>
          <input
            type="checkbox"
            checked={value.isLgl ?? false}
            onChange={(e) => handleLegalChange(e.target.checked)}
            disabled={disabled}
          />
          Legal numbering format
        </label>
      </div>
    </div>
  );
}

/**
 * Create default Level value.
 */
export function createDefaultLevel(ilvl: DocxIlvl): DocxLevel {
  return {
    ilvl,
    start: 1,
    numFmt: "decimal",
    lvlText: { val: `%${ilvl + 1}.` },
    lvlJc: "left",
    suff: "tab",
  };
}

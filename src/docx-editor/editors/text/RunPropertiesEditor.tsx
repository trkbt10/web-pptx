/**
 * @file RunPropertiesEditor - Editor for DOCX run properties
 *
 * Provides UI controls for editing text formatting properties like
 * bold, italic, underline, font size, font family, and color.
 */

import { useCallback, type CSSProperties } from "react";
import type { DocxRunProperties, DocxHighlightColor } from "../../../docx/domain/run";
import type { HalfPoints } from "../../../docx/domain/types";
import type { EditorProps } from "../../types";
import { ToggleButton, Input, Select } from "../../../office-editor-components/primitives";
import { FieldGroup } from "../../../office-editor-components/layout";
import type { SelectOption } from "../../../office-editor-components/types";
import styles from "./RunPropertiesEditor.module.css";

// =============================================================================
// Types
// =============================================================================

export type RunPropertiesEditorProps = EditorProps<DocxRunProperties> & {
  readonly style?: CSSProperties;
  /** Show spacing section */
  readonly showSpacing?: boolean;
  /** Show highlight color selector */
  readonly showHighlight?: boolean;
};

// =============================================================================
// Constants
// =============================================================================

const HIGHLIGHT_OPTIONS: SelectOption<DocxHighlightColor | "none">[] = [
  { value: "none", label: "No Highlight" },
  { value: "yellow", label: "Yellow" },
  { value: "green", label: "Green" },
  { value: "cyan", label: "Cyan" },
  { value: "magenta", label: "Magenta" },
  { value: "blue", label: "Blue" },
  { value: "red", label: "Red" },
  { value: "darkBlue", label: "Dark Blue" },
  { value: "darkCyan", label: "Dark Cyan" },
  { value: "darkGreen", label: "Dark Green" },
  { value: "darkMagenta", label: "Dark Magenta" },
  { value: "darkRed", label: "Dark Red" },
  { value: "darkYellow", label: "Dark Yellow" },
  { value: "darkGray", label: "Dark Gray" },
  { value: "lightGray", label: "Light Gray" },
  { value: "black", label: "Black" },
];

const VERTICAL_ALIGN_OPTIONS: SelectOption<"baseline" | "superscript" | "subscript">[] = [
  { value: "baseline", label: "Normal" },
  { value: "superscript", label: "Superscript" },
  { value: "subscript", label: "Subscript" },
];

// =============================================================================
// Component
// =============================================================================

/**
 * Editor component for DOCX run properties.
 */
export function RunPropertiesEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  showSpacing = true,
  showHighlight = true,
}: RunPropertiesEditorProps) {
  const handleBoldToggle = useCallback(() => {
    onChange({ ...value, b: !value.b });
  }, [value, onChange]);

  const handleItalicToggle = useCallback(() => {
    onChange({ ...value, i: !value.i });
  }, [value, onChange]);

  const handleUnderlineToggle = useCallback(() => {
    const newU = value.u ? undefined : { val: "single" as const };
    onChange({ ...value, u: newU });
  }, [value, onChange]);

  const handleStrikeToggle = useCallback(() => {
    onChange({ ...value, strike: !value.strike });
  }, [value, onChange]);

  const handleFontSizeChange = useCallback(
    (size: string | number) => {
      const numSize = typeof size === "string" ? parseFloat(size) : size;
      if (!isNaN(numSize) && numSize > 0) {
        const halfPoints = (numSize * 2) as HalfPoints;
        onChange({ ...value, sz: halfPoints, szCs: halfPoints });
      }
    },
    [value, onChange],
  );

  const handleFontFamilyChange = useCallback(
    (family: string | number) => {
      const familyStr = String(family);
      onChange({
        ...value,
        rFonts: {
          ...value.rFonts,
          ascii: familyStr,
          hAnsi: familyStr,
          eastAsia: familyStr,
          cs: familyStr,
        },
      });
    },
    [value, onChange],
  );

  const handleColorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const color = e.target.value.slice(1); // Remove # prefix
      onChange({ ...value, color: { val: color } });
    },
    [value, onChange],
  );

  const handleHighlightChange = useCallback(
    (highlight: DocxHighlightColor | "none") => {
      if (highlight === "none") {
        const { highlight: _removed, ...rest } = value;
        void _removed;
        onChange(rest);
      } else {
        onChange({ ...value, highlight });
      }
    },
    [value, onChange],
  );

  const handleVertAlignChange = useCallback(
    (vertAlign: "baseline" | "superscript" | "subscript") => {
      onChange({ ...value, vertAlign });
    },
    [value, onChange],
  );

  const fontSizeInPoints = value.sz ? value.sz / 2 : "";
  const fontFamily = value.rFonts?.ascii ?? value.rFonts?.hAnsi ?? "";
  const textColor = value.color?.val ?? "000000";

  const containerClassName = className ? `${styles.container} ${className}` : styles.container;

  return (
    <div className={containerClassName} style={style}>
      {/* Font formatting buttons */}
      <FieldGroup label="Formatting">
        <div className={styles.formatting}>
          <ToggleButton
            pressed={value.b ?? false}
            onChange={handleBoldToggle}
            label="B"
            ariaLabel="Bold"
            disabled={disabled}
            style={{ fontWeight: 700 }}
          />
          <ToggleButton
            pressed={value.i ?? false}
            onChange={handleItalicToggle}
            label="I"
            ariaLabel="Italic"
            disabled={disabled}
            style={{ fontStyle: "italic" }}
          />
          <ToggleButton
            pressed={value.u !== undefined}
            onChange={handleUnderlineToggle}
            label="U"
            ariaLabel="Underline"
            disabled={disabled}
            style={{ textDecoration: "underline" }}
          />
          <ToggleButton
            pressed={value.strike ?? false}
            onChange={handleStrikeToggle}
            label="S"
            ariaLabel="Strikethrough"
            disabled={disabled}
            style={{ textDecoration: "line-through" }}
          />
        </div>
      </FieldGroup>

      {/* Font size and family */}
      <FieldGroup label="Font">
        <div className={styles.fontSection}>
          <Input
            type="number"
            value={fontSizeInPoints}
            onChange={handleFontSizeChange}
            disabled={disabled}
            placeholder="Size"
            min={1}
            max={999}
            width={60}
          />
          <Input
            type="text"
            value={fontFamily}
            onChange={handleFontFamilyChange}
            disabled={disabled}
            placeholder="Font Family"
          />
        </div>
      </FieldGroup>

      {/* Color */}
      <FieldGroup label="Color">
        <div className={styles.colorSection}>
          <input
            type="color"
            value={`#${textColor}`}
            onChange={handleColorChange}
            disabled={disabled}
            title="Text Color"
          />
        </div>
      </FieldGroup>

      {/* Highlight color */}
      {showHighlight && (
        <FieldGroup label="Highlight">
          <div className={styles.highlightSection}>
            <Select
              value={(value.highlight ?? "none") as DocxHighlightColor | "none"}
              onChange={handleHighlightChange}
              options={HIGHLIGHT_OPTIONS}
              disabled={disabled}
            />
          </div>
        </FieldGroup>
      )}

      {/* Vertical alignment */}
      {showSpacing && (
        <FieldGroup label="Position">
          <div className={styles.spacingSection}>
            <Select
              value={value.vertAlign ?? "baseline"}
              onChange={handleVertAlignChange}
              options={VERTICAL_ALIGN_OPTIONS}
              disabled={disabled}
            />
          </div>
        </FieldGroup>
      )}
    </div>
  );
}

/**
 * Create default RunProperties value.
 */
export function createDefaultRunProperties(): DocxRunProperties {
  return {};
}

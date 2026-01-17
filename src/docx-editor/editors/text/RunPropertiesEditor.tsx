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
    (size: number) => {
      const halfPoints = (size * 2) as HalfPoints;
      onChange({ ...value, sz: halfPoints, szCs: halfPoints });
    },
    [value, onChange],
  );

  const handleFontFamilyChange = useCallback(
    (family: string) => {
      onChange({
        ...value,
        rFonts: {
          ...value.rFonts,
          ascii: family,
          hAnsi: family,
          eastAsia: family,
          cs: family,
        },
      });
    },
    [value, onChange],
  );

  const handleColorChange = useCallback(
    (color: string) => {
      onChange({ ...value, color: { val: color } });
    },
    [value, onChange],
  );

  const handleHighlightChange = useCallback(
    (highlight: DocxHighlightColor | undefined) => {
      if (highlight === undefined || highlight === "none") {
        const { highlight: _removed, ...rest } = value;
        void _removed;
        onChange(rest);
      } else {
        onChange({ ...value, highlight });
      }
    },
    [value, onChange],
  );

  const fontSizeInPoints = value.sz ? value.sz / 2 : undefined;
  const fontFamily = value.rFonts?.ascii ?? value.rFonts?.hAnsi ?? "";
  const textColor = value.color?.val ?? "";

  return (
    <div className={className} style={style}>
      {/* Font formatting buttons */}
      <div className="run-properties-formatting">
        <button
          type="button"
          onClick={handleBoldToggle}
          disabled={disabled}
          aria-pressed={value.b ?? false}
          title="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={handleItalicToggle}
          disabled={disabled}
          aria-pressed={value.i ?? false}
          title="Italic"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={handleUnderlineToggle}
          disabled={disabled}
          aria-pressed={value.u !== undefined}
          title="Underline"
        >
          <u>U</u>
        </button>
        <button
          type="button"
          onClick={handleStrikeToggle}
          disabled={disabled}
          aria-pressed={value.strike ?? false}
          title="Strikethrough"
        >
          <s>S</s>
        </button>
      </div>

      {/* Font size and family */}
      <div className="run-properties-font">
        <input
          type="number"
          value={fontSizeInPoints ?? ""}
          onChange={(e) => handleFontSizeChange(Number(e.target.value))}
          disabled={disabled}
          placeholder="Size"
          min={1}
          max={999}
          title="Font Size (points)"
        />
        <input
          type="text"
          value={fontFamily}
          onChange={(e) => handleFontFamilyChange(e.target.value)}
          disabled={disabled}
          placeholder="Font Family"
          title="Font Family"
        />
      </div>

      {/* Color */}
      <div className="run-properties-color">
        <input
          type="color"
          value={textColor ? `#${textColor}` : "#000000"}
          onChange={(e) => handleColorChange(e.target.value.slice(1))}
          disabled={disabled}
          title="Text Color"
        />
      </div>

      {/* Highlight color */}
      {showHighlight && (
        <div className="run-properties-highlight">
          <select
            value={value.highlight ?? "none"}
            onChange={(e) =>
              handleHighlightChange(
                e.target.value === "none" ? undefined : (e.target.value as DocxHighlightColor),
              )
            }
            disabled={disabled}
            title="Highlight Color"
          >
            <option value="none">No Highlight</option>
            <option value="yellow">Yellow</option>
            <option value="green">Green</option>
            <option value="cyan">Cyan</option>
            <option value="magenta">Magenta</option>
            <option value="blue">Blue</option>
            <option value="red">Red</option>
            <option value="darkBlue">Dark Blue</option>
            <option value="darkCyan">Dark Cyan</option>
            <option value="darkGreen">Dark Green</option>
            <option value="darkMagenta">Dark Magenta</option>
            <option value="darkRed">Dark Red</option>
            <option value="darkYellow">Dark Yellow</option>
            <option value="darkGray">Dark Gray</option>
            <option value="lightGray">Light Gray</option>
            <option value="black">Black</option>
          </select>
        </div>
      )}

      {/* Vertical alignment */}
      {showSpacing && (
        <div className="run-properties-spacing">
          <select
            value={value.vertAlign ?? "baseline"}
            onChange={(e) =>
              onChange({
                ...value,
                vertAlign: e.target.value as "baseline" | "superscript" | "subscript",
              })
            }
            disabled={disabled}
            title="Vertical Alignment"
          >
            <option value="baseline">Normal</option>
            <option value="superscript">Superscript</option>
            <option value="subscript">Subscript</option>
          </select>
        </div>
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

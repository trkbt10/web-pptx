/**
 * @file StyleEditor - Editor for DOCX style definitions
 *
 * Provides UI controls for editing style properties like
 * name, type, base style, and visibility options.
 */

import { useCallback, type CSSProperties } from "react";
import type { DocxStyle, DocxStyleType } from "../../../docx/domain/styles";
import type { DocxStyleId } from "../../../docx/domain/types";
import type { EditorProps } from "../../types";

// =============================================================================
// Types
// =============================================================================

export type StyleEditorProps = EditorProps<DocxStyle> & {
  readonly style?: CSSProperties;
  /** Available style IDs for basedOn/link selection */
  readonly availableStyles?: readonly { id: DocxStyleId; name: string; type: DocxStyleType }[];
  /** Show advanced options */
  readonly showAdvanced?: boolean;
};

// =============================================================================
// Constants
// =============================================================================

const STYLE_TYPE_OPTIONS: { value: DocxStyleType; label: string }[] = [
  { value: "paragraph", label: "Paragraph" },
  { value: "character", label: "Character" },
  { value: "table", label: "Table" },
  { value: "numbering", label: "Numbering" },
];

// =============================================================================
// Component
// =============================================================================

/**
 * Editor component for DOCX style definitions.
 */
export function StyleEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  availableStyles = [],
  showAdvanced = false,
}: StyleEditorProps) {
  const handleNameChange = useCallback(
    (name: string) => {
      onChange({ ...value, name: { val: name } });
    },
    [value, onChange],
  );

  const handleTypeChange = useCallback(
    (type: DocxStyleType) => {
      onChange({ ...value, type });
    },
    [value, onChange],
  );

  const handleBasedOnChange = useCallback(
    (basedOnId: string) => {
      if (basedOnId === "") {
        const { basedOn: _removed, ...rest } = value;
        void _removed;
        onChange(rest);
      } else {
        onChange({ ...value, basedOn: { val: basedOnId as DocxStyleId } });
      }
    },
    [value, onChange],
  );

  const handleNextChange = useCallback(
    (nextId: string) => {
      if (nextId === "") {
        const { next: _removed, ...rest } = value;
        void _removed;
        onChange(rest);
      } else {
        onChange({ ...value, next: { val: nextId as DocxStyleId } });
      }
    },
    [value, onChange],
  );

  const handlePriorityChange = useCallback(
    (priority: number | undefined) => {
      if (priority === undefined) {
        const { uiPriority: _removed, ...rest } = value;
        void _removed;
        onChange(rest);
      } else {
        onChange({ ...value, uiPriority: { val: priority } });
      }
    },
    [value, onChange],
  );

  const handleBooleanToggle = useCallback(
    (key: keyof DocxStyle, checked: boolean) => {
      if (checked) {
        onChange({ ...value, [key]: true });
      } else {
        const newValue = { ...value };
        delete (newValue as Record<string, unknown>)[key];
        onChange(newValue as DocxStyle);
      }
    },
    [value, onChange],
  );

  // Filter available styles by compatible type
  const compatibleStyles = availableStyles.filter((s) => {
    if (value.type === "paragraph") {
      return s.type === "paragraph";
    }
    if (value.type === "character") {
      return s.type === "character";
    }
    if (value.type === "table") {
      return s.type === "table";
    }
    return s.type === value.type;
  });

  const paragraphStyles = availableStyles.filter((s) => s.type === "paragraph");

  return (
    <div className={className} style={style}>
      {/* Style Name */}
      <div className="style-editor-name">
        <label>Style Name</label>
        <input
          type="text"
          value={value.name?.val ?? ""}
          onChange={(e) => handleNameChange(e.target.value)}
          disabled={disabled}
          placeholder="Style name"
        />
      </div>

      {/* Style Type */}
      <div className="style-editor-type">
        <label>Style Type</label>
        <select
          value={value.type}
          onChange={(e) => handleTypeChange(e.target.value as DocxStyleType)}
          disabled={disabled}
        >
          {STYLE_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Style ID (read-only display) */}
      <div className="style-editor-id">
        <label>Style ID</label>
        <input type="text" value={value.styleId} disabled readOnly />
      </div>

      {/* Based On */}
      <div className="style-editor-based-on">
        <label>Based On</label>
        <select
          value={value.basedOn?.val ?? ""}
          onChange={(e) => handleBasedOnChange(e.target.value)}
          disabled={disabled}
        >
          <option value="">(None)</option>
          {compatibleStyles
            .filter((s) => s.id !== value.styleId)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
        </select>
      </div>

      {/* Next Style (paragraph styles only) */}
      {value.type === "paragraph" && (
        <div className="style-editor-next">
          <label>Next Paragraph Style</label>
          <select
            value={value.next?.val ?? ""}
            onChange={(e) => handleNextChange(e.target.value)}
            disabled={disabled}
          >
            <option value="">(Same as current)</option>
            {paragraphStyles.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* UI Priority */}
      <div className="style-editor-priority">
        <label>Priority (lower = higher in list)</label>
        <input
          type="number"
          value={value.uiPriority?.val ?? ""}
          onChange={(e) =>
            handlePriorityChange(e.target.value === "" ? undefined : Number(e.target.value))
          }
          disabled={disabled}
          min={0}
          placeholder="Auto"
        />
      </div>

      {/* Quick Access Options */}
      <div className="style-editor-options">
        <label>
          <input
            type="checkbox"
            checked={value.qFormat ?? false}
            onChange={(e) => handleBooleanToggle("qFormat", e.target.checked)}
            disabled={disabled}
          />
          Show in Quick Styles gallery
        </label>
        <label>
          <input
            type="checkbox"
            checked={value.default ?? false}
            onChange={(e) => handleBooleanToggle("default", e.target.checked)}
            disabled={disabled}
          />
          Default style for type
        </label>
      </div>

      {/* Advanced Options */}
      {showAdvanced && (
        <div className="style-editor-advanced">
          <label>
            <input
              type="checkbox"
              checked={value.semiHidden ?? false}
              onChange={(e) => handleBooleanToggle("semiHidden", e.target.checked)}
              disabled={disabled}
            />
            Semi-hidden
          </label>
          <label>
            <input
              type="checkbox"
              checked={value.unhideWhenUsed ?? false}
              onChange={(e) => handleBooleanToggle("unhideWhenUsed", e.target.checked)}
              disabled={disabled}
            />
            Unhide when used
          </label>
          <label>
            <input
              type="checkbox"
              checked={value.locked ?? false}
              onChange={(e) => handleBooleanToggle("locked", e.target.checked)}
              disabled={disabled}
            />
            Locked (cannot modify)
          </label>
          <label>
            <input
              type="checkbox"
              checked={value.customStyle ?? false}
              onChange={(e) => handleBooleanToggle("customStyle", e.target.checked)}
              disabled={disabled}
            />
            Custom style
          </label>
        </div>
      )}
    </div>
  );
}

/**
 * Create default Style value.
 */
export function createDefaultStyle(styleId: DocxStyleId, type: DocxStyleType = "paragraph"): DocxStyle {
  return {
    type,
    styleId,
    name: { val: "New Style" },
    customStyle: true,
  };
}

/**
 * @file ColorPickerPopover component
 *
 * Adobe/Figma-style color picker that opens in a popover.
 * Displays a color swatch that, when clicked, opens a popover with RGB/HSL sliders.
 */

import { useCallback, type CSSProperties } from "react";
import { Popover } from "../primitives/Popover";
import { Slider } from "../primitives/Slider";
import { Input } from "../primitives/Input";
import { ColorSwatch, type ColorSwatchSize } from "./ColorSwatch";
import { ColorModeSliders } from "./components";
import { parseHexInput } from "./color-convert";

export type ColorPickerPopoverProps = {
  /** Hex color value (6 characters, no #) */
  readonly value: string;
  /** Called when color changes */
  readonly onChange: (hex: string) => void;
  /** Alpha value (0-1) */
  readonly alpha?: number;
  /** Called when alpha changes */
  readonly onAlphaChange?: (alpha: number) => void;
  /** Show alpha slider */
  readonly showAlpha?: boolean;
  /** Size of the trigger swatch */
  readonly size?: ColorSwatchSize;
  /** Disable interaction */
  readonly disabled?: boolean;
};

// =============================================================================
// Styles
// =============================================================================

const popoverContentStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  width: "240px",
};

const previewRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const previewSwatchStyle: CSSProperties = {
  width: "48px",
  height: "48px",
  borderRadius: "6px",
  flexShrink: 0,
};

const hexInputContainerStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const hexLabelStyle: CSSProperties = {
  fontSize: "10px",
  color: "var(--text-tertiary, #666)",
  textTransform: "uppercase",
};

const sliderRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const sliderLabelStyle: CSSProperties = {
  width: "16px",
  fontSize: "11px",
  fontWeight: 500,
  color: "var(--text-tertiary, #666)",
};

const sliderContainerStyle: CSSProperties = {
  flex: 1,
};

const sliderValueStyle: CSSProperties = {
  width: "32px",
  textAlign: "right",
  fontSize: "11px",
  color: "var(--text-secondary, #999)",
};

// =============================================================================
// Main Component
// =============================================================================

/**
 * A color picker popover triggered by clicking a color swatch.
 * Provides RGB and HSL slider modes for color adjustment.
 */
export function ColorPickerPopover({
  value,
  onChange,
  alpha = 1,
  onAlphaChange,
  showAlpha = false,
  size = "md",
  disabled,
}: ColorPickerPopoverProps) {
  const handleHexInput = useCallback(
    (input: string | number) => {
      const hex = parseHexInput(String(input));
      if (hex !== null) {
        onChange(hex);
      }
    },
    [onChange]
  );

  const trigger = <ColorSwatch color={value} alpha={alpha} size={size} disabled={disabled} />;

  return (
    <Popover trigger={trigger} align="start" side="bottom" disabled={disabled}>
      <div style={popoverContentStyle}>
        {/* Preview + Hex Input */}
        <div style={previewRowStyle}>
          <ColorSwatch color={value} alpha={alpha} style={previewSwatchStyle} />
          <div style={hexInputContainerStyle}>
            <span style={hexLabelStyle}>Hex</span>
            <Input type="text" value={value} onChange={handleHexInput} placeholder="RRGGBB" />
          </div>
        </div>

        {/* Mode Tabs + Sliders */}
        <ColorModeSliders value={value} onChange={onChange} />

        {/* Alpha Slider */}
        {showAlpha && onAlphaChange && (
          <div style={sliderRowStyle}>
            <span style={sliderLabelStyle}>A</span>
            <div style={sliderContainerStyle}>
              <Slider value={Math.round(alpha * 100)} onChange={(v) => onAlphaChange(v / 100)} min={0} max={100} showValue={false} />
            </div>
            <span style={sliderValueStyle}>{Math.round(alpha * 100)}%</span>
          </div>
        )}
      </div>
    </Popover>
  );
}

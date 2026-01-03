/**
 * @file FillPickerPopover component
 *
 * Adobe/Figma-style fill picker that opens in a popover.
 * Supports NoFill, Solid, Gradient, Pattern fills with appropriate editors.
 */

import { useState, useCallback, useMemo, type CSSProperties, type ReactNode } from "react";
import { Popover } from "../primitives/Popover";
import { Slider } from "../primitives/Slider";
import { Input } from "../primitives/Input";
import { Select } from "../primitives/Select";
import { ColorSwatch, type ColorSwatchSize } from "./ColorSwatch";
import { ColorModeSliders } from "./components";
import { parseHexInput } from "./color-convert";
import { deg, pct } from "../../../pptx/domain/types";
import type {
  Fill,
  SolidFill,
  GradientFill,
  GradientStop,
  LinearGradient,
  Color,
} from "../../../pptx/domain/color";
import type { SelectOption } from "../../types";

export type FillPickerPopoverProps = {
  /** Current fill value */
  readonly value: Fill;
  /** Called when fill changes */
  readonly onChange: (fill: Fill) => void;
  /** Size of the trigger swatch */
  readonly size?: ColorSwatchSize;
  /** Disable interaction */
  readonly disabled?: boolean;
  /** Custom trigger element */
  readonly trigger?: ReactNode;
};

// =============================================================================
// Fill Utilities
// =============================================================================

type FillType = Fill["type"];

const fillTypeOptions: SelectOption<FillType>[] = [
  { value: "noFill", label: "None" },
  { value: "solidFill", label: "Solid" },
  { value: "gradientFill", label: "Gradient" },
];

function getFillPreview(fill: Fill): { color: string; gradient?: string } {
  switch (fill.type) {
    case "noFill":
      return { color: "transparent" };
    case "solidFill":
      if (fill.color.spec.type === "srgb") {
        return { color: fill.color.spec.value };
      }
      return { color: "888888" };
    case "gradientFill":
      if (fill.stops.length >= 2) {
        const colors = fill.stops.map((stop) => {
          if (stop.color.spec.type === "srgb") {
            return `#${stop.color.spec.value}`;
          }
          return "#888888";
        });
        const angle = fill.linear?.angle ?? 0;
        return {
          color: colors[0].replace("#", ""),
          gradient: `linear-gradient(${angle}deg, ${colors.join(", ")})`,
        };
      }
      return { color: "888888" };
    default:
      return { color: "888888" };
  }
}

function createDefaultColor(hex: string): Color {
  return { spec: { type: "srgb", value: hex } };
}

function createDefaultFill(type: FillType): Fill {
  switch (type) {
    case "noFill":
      return { type: "noFill" };
    case "solidFill":
      return { type: "solidFill", color: createDefaultColor("000000") };
    case "gradientFill":
      return {
        type: "gradientFill",
        stops: [
          { position: pct(0), color: createDefaultColor("000000") },
          { position: pct(100), color: createDefaultColor("FFFFFF") },
        ],
        linear: { angle: deg(90), scaled: true },
        rotWithShape: true,
      };
    default:
      return { type: "noFill" };
  }
}

// =============================================================================
// Styles
// =============================================================================

const popoverContentStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  width: "260px",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const previewSwatchStyle: CSSProperties = {
  width: "36px",
  height: "36px",
  borderRadius: "6px",
  flexShrink: 0,
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

const gradientStopsStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const gradientStopRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

function getTriggerBorder(isNoFill: boolean): string {
  if (isNoFill) {
    return "2px dashed var(--border-subtle, #444)";
  }
  return "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))";
}

function getSizePixels(size: ColorSwatchSize): string {
  const sizeMap: Record<ColorSwatchSize, string> = {
    sm: "16px",
    md: "24px",
    lg: "32px",
  };
  return sizeMap[size];
}

// =============================================================================
// Sub-components
// =============================================================================

type SolidFillEditorProps = {
  readonly value: SolidFill;
  readonly onChange: (fill: SolidFill) => void;
};

function SolidFillEditor({ value, onChange }: SolidFillEditorProps) {
  const hex = value.color.spec.type === "srgb" ? value.color.spec.value : "000000";

  const handleHexChange = useCallback(
    (newHex: string) => {
      onChange({ ...value, color: createDefaultColor(newHex) });
    },
    [value, onChange]
  );

  const handleHexInput = useCallback(
    (input: string | number) => {
      const parsedHex = parseHexInput(String(input));
      if (parsedHex !== null) {
        handleHexChange(parsedHex);
      }
    },
    [handleHexChange]
  );

  return (
    <>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <ColorSwatch color={hex} style={previewSwatchStyle} />
        <div style={{ flex: 1 }}>
          <Input type="text" value={hex} onChange={handleHexInput} placeholder="RRGGBB" />
        </div>
      </div>

      <ColorModeSliders value={hex} onChange={handleHexChange} />
    </>
  );
}

type GradientFillEditorProps = {
  readonly value: GradientFill;
  readonly onChange: (fill: GradientFill) => void;
};

function GradientFillEditor({ value, onChange }: GradientFillEditorProps) {
  const [selectedStopIndex, setSelectedStopIndex] = useState(0);

  const angle = value.linear?.angle ?? 0;

  const handleAngleChange = useCallback(
    (newAngle: number) => {
      onChange({
        ...value,
        linear: { ...(value.linear ?? { scaled: true }), angle: deg(newAngle) } as LinearGradient,
      });
    },
    [value, onChange]
  );

  const handleStopColorChange = useCallback(
    (index: number, hex: string) => {
      const newStops = [...value.stops];
      newStops[index] = { ...newStops[index], color: createDefaultColor(hex) };
      onChange({ ...value, stops: newStops });
    },
    [value, onChange]
  );

  const handleStopPositionChange = useCallback(
    (index: number, position: number) => {
      const newStops = [...value.stops];
      newStops[index] = { ...newStops[index], position: pct(position) };
      onChange({ ...value, stops: newStops });
    },
    [value, onChange]
  );

  const getStopHex = (stop: GradientStop): string => {
    return stop.color.spec.type === "srgb" ? stop.color.spec.value : "888888";
  };

  return (
    <>
      {/* Gradient Preview */}
      <div
        style={{
          height: "24px",
          borderRadius: "4px",
          background: `linear-gradient(${angle}deg, ${value.stops.map((s) => `#${getStopHex(s)} ${s.position}%`).join(", ")})`,
        }}
      />

      {/* Angle */}
      <div style={sliderRowStyle}>
        <span style={sliderLabelStyle}>°</span>
        <div style={sliderContainerStyle}>
          <Slider value={angle} onChange={handleAngleChange} min={0} max={360} showValue={false} />
        </div>
        <span style={sliderValueStyle}>{angle}°</span>
      </div>

      {/* Stops */}
      <div style={gradientStopsStyle}>
        {value.stops.map((stop, index) => {
          const stopHex = getStopHex(stop);
          return (
            <div
              key={index}
              style={{
                ...gradientStopRowStyle,
                backgroundColor: selectedStopIndex === index ? "var(--bg-tertiary, #222)" : "transparent",
                padding: "4px",
                borderRadius: "4px",
                cursor: "pointer",
              }}
              onClick={() => setSelectedStopIndex(index)}
            >
              <ColorSwatch color={stopHex} size="sm" />
              <Input
                type="text"
                value={stopHex}
                onChange={(v) => {
                  const parsedHex = parseHexInput(String(v));
                  if (parsedHex !== null) {
                    handleStopColorChange(index, parsedHex);
                  }
                }}
                style={{ flex: 1, width: "auto" }}
              />
              <Input
                type="number"
                value={stop.position}
                onChange={(v) => handleStopPositionChange(index, Number(v))}
                suffix="%"
                style={{ width: "60px" }}
                min={0}
                max={100}
              />
            </div>
          );
        })}
      </div>
    </>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * A fill picker popover for editing Fill values (NoFill, Solid, Gradient).
 */
export function FillPickerPopover({
  value,
  onChange,
  size = "md",
  disabled,
  trigger,
}: FillPickerPopoverProps) {
  const preview = useMemo(() => getFillPreview(value), [value]);

  const handleTypeChange = useCallback(
    (newType: string) => {
      onChange(createDefaultFill(newType as FillType));
    },
    [onChange]
  );

  const sizePixels = getSizePixels(size);
  const triggerElement = trigger ?? (
    <div
      style={{
        ...previewSwatchStyle,
        width: sizePixels,
        height: sizePixels,
        background: preview.gradient ?? `#${preview.color}`,
        border: getTriggerBorder(value.type === "noFill"),
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    />
  );

  return (
    <Popover trigger={triggerElement} align="start" side="bottom" disabled={disabled}>
      <div style={popoverContentStyle}>
        {/* Fill Type Selector */}
        <div style={headerStyle}>
          <Select
            value={value.type}
            onChange={handleTypeChange}
            options={fillTypeOptions}
            style={{ flex: 1 }}
          />
        </div>

        {/* Type-specific Editor */}
        {value.type === "noFill" && (
          <div style={{ textAlign: "center", color: "var(--text-tertiary)", fontSize: "12px", padding: "16px 0" }}>
            No fill
          </div>
        )}

        {value.type === "solidFill" && (
          <SolidFillEditor value={value} onChange={(v) => onChange(v)} />
        )}

        {value.type === "gradientFill" && (
          <GradientFillEditor value={value} onChange={(v) => onChange(v)} />
        )}
      </div>
    </Popover>
  );
}

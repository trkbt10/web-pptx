/**
 * @file HslSliders component
 *
 * HSL color input with three sliders for Hue, Saturation, Lightness values.
 */

import type { CSSProperties } from "react";
import { Slider } from "../../primitives/Slider";

export type HslSlidersProps = {
  readonly h: number;
  readonly s: number;
  readonly l: number;
  readonly onChange: (h: number, s: number, l: number) => void;
};

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const labelStyle: CSSProperties = {
  width: "16px",
  fontSize: "11px",
  fontWeight: 500,
  color: "var(--text-tertiary, #666)",
};

const sliderContainerStyle: CSSProperties = {
  flex: 1,
};

const valueStyle: CSSProperties = {
  width: "32px",
  textAlign: "right",
  fontSize: "11px",
  color: "var(--text-secondary, #999)",
};

/**
 * HSL color input with three sliders for Hue, Saturation, Lightness values.
 */
export function HslSliders({ h, s, l, onChange }: HslSlidersProps) {
  return (
    <div style={containerStyle}>
      <div style={rowStyle}>
        <span style={labelStyle}>H</span>
        <div style={sliderContainerStyle}>
          <Slider value={h} onChange={(v) => onChange(v, s, l)} min={0} max={360} showValue={false} />
        </div>
        <span style={valueStyle}>{h}°</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>S</span>
        <div style={sliderContainerStyle}>
          <Slider value={s} onChange={(v) => onChange(h, v, l)} min={0} max={100} showValue={false} />
        </div>
        <span style={valueStyle}>{s}%</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>L</span>
        <div style={sliderContainerStyle}>
          <Slider value={l} onChange={(v) => onChange(h, s, v)} min={0} max={100} showValue={false} />
        </div>
        <span style={valueStyle}>{l}%</span>
      </div>
    </div>
  );
}

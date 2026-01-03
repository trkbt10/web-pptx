/**
 * @file RgbSliders component
 *
 * RGB color input with three sliders for Red, Green, Blue values.
 */

import type { CSSProperties } from "react";
import { Slider } from "../../primitives/Slider";

export type RgbSlidersProps = {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly onChange: (r: number, g: number, b: number) => void;
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

const labelBaseStyle: CSSProperties = {
  width: "16px",
  fontSize: "11px",
  fontWeight: 500,
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
 * RGB color input with three sliders for Red, Green, Blue values.
 */
export function RgbSliders({ r, g, b, onChange }: RgbSlidersProps) {
  return (
    <div style={containerStyle}>
      <div style={rowStyle}>
        <span style={{ ...labelBaseStyle, color: "#e57373" }}>R</span>
        <div style={sliderContainerStyle}>
          <Slider value={r} onChange={(v) => onChange(v, g, b)} min={0} max={255} showValue={false} />
        </div>
        <span style={valueStyle}>{r}</span>
      </div>
      <div style={rowStyle}>
        <span style={{ ...labelBaseStyle, color: "#81c784" }}>G</span>
        <div style={sliderContainerStyle}>
          <Slider value={g} onChange={(v) => onChange(r, v, b)} min={0} max={255} showValue={false} />
        </div>
        <span style={valueStyle}>{g}</span>
      </div>
      <div style={rowStyle}>
        <span style={{ ...labelBaseStyle, color: "#64b5f6" }}>B</span>
        <div style={sliderContainerStyle}>
          <Slider value={b} onChange={(v) => onChange(r, g, v)} min={0} max={255} showValue={false} />
        </div>
        <span style={valueStyle}>{b}</span>
      </div>
    </div>
  );
}

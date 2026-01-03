/**
 * @file GradientFillEditor component
 *
 * Editor for gradient fill with angle and color stops.
 */

import { useState, useCallback, type CSSProperties } from "react";
import type { GradientFill, LinearGradient } from "../../../../pptx/domain/color";
import { deg, pct } from "../../../../pptx/domain/types";
import { LabeledSlider } from "../../common";
import { GradientStopRow } from "./GradientStopRow";
import { createDefaultColor, getStopHex } from "./fill-utils";

export type GradientFillEditorProps = {
  readonly value: GradientFill;
  readonly onChange: (fill: GradientFill) => void;
};

const previewStyle = (angle: number, cssGradient: string): CSSProperties => ({
  height: "24px",
  borderRadius: "4px",
  background: cssGradient,
});

const stopsContainerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

function buildGradientCss(angle: number, stops: GradientFill["stops"]): string {
  const colorStops = stops.map((s) => `#${getStopHex(s)} ${s.position}%`).join(", ");
  return `linear-gradient(${angle}deg, ${colorStops})`;
}

/**
 * Editor for gradient fill values.
 */
export function GradientFillEditor({ value, onChange }: GradientFillEditorProps) {
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

  return (
    <>
      <div style={previewStyle(angle, buildGradientCss(angle, value.stops))} />

      <LabeledSlider
        label="°"
        value={angle}
        onChange={handleAngleChange}
        min={0}
        max={360}
        suffix="°"
      />

      <div style={stopsContainerStyle}>
        {value.stops.map((stop, index) => (
          <GradientStopRow
            key={index}
            stop={stop}
            selected={selectedStopIndex === index}
            onSelect={() => setSelectedStopIndex(index)}
            onColorChange={(hex) => handleStopColorChange(index, hex)}
            onPositionChange={(pos) => handleStopPositionChange(index, pos)}
          />
        ))}
      </div>
    </>
  );
}

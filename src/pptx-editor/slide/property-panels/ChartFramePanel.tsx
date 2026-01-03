/**
 * @file Chart GraphicFrame property panel component
 *
 * Displays property editors for GraphicFrame elements containing charts.
 */

import type { GraphicFrame } from "../../../pptx/domain";
import type { Chart } from "../../../pptx/domain/chart";
import { Accordion } from "../../ui/layout/Accordion";
import {
  NonVisualPropertiesEditor,
  TransformEditor,
  ChartEditor,
} from "../../editors";

// =============================================================================
// Types
// =============================================================================

export type ChartFramePanelProps = {
  readonly shape: GraphicFrame;
  readonly chart: Chart;
  readonly onChange: (shape: GraphicFrame) => void;
};

// =============================================================================
// Component
// =============================================================================

/**
 * GraphicFrame (chart) editor panel.
 *
 * Displays editors for:
 * - Identity (NonVisual properties)
 * - Transform
 * - Chart content
 */
export function ChartFramePanel({
  shape,
  chart,
  onChange,
}: ChartFramePanelProps) {
  const handleChartChange = (newChart: Chart) => {
    if (shape.content.type !== "chart") {
      return;
    }
    onChange({
      ...shape,
      content: {
        ...shape.content,
        data: {
          ...shape.content.data,
          parsedChart: newChart,
        },
      },
    });
  };

  return (
    <>
      <Accordion title="Identity" defaultExpanded={false}>
        <NonVisualPropertiesEditor
          value={shape.nonVisual}
          onChange={(nv) => onChange({ ...shape, nonVisual: nv })}
        />
      </Accordion>

      <Accordion title="Transform" defaultExpanded={false}>
        {shape.transform && (
          <TransformEditor
            value={shape.transform}
            onChange={(transform) => onChange({ ...shape, transform })}
          />
        )}
      </Accordion>

      <Accordion title="Chart" defaultExpanded>
        <ChartEditor value={chart} onChange={handleChartChange} />
      </Accordion>
    </>
  );
}

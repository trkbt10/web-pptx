/**
 * @file Diagram GraphicFrame property panel component
 *
 * Displays property editors for GraphicFrame elements containing diagrams (SmartArt).
 */

import type { GraphicFrame } from "../../../pptx/domain/index";
import type { DiagramDataModel } from "../../../pptx/domain/diagram";
import { Accordion } from "../../ui/layout/Accordion";
import {
  NonVisualPropertiesEditor,
  TransformEditor,
  DiagramEditor,
} from "../../editors/index";

// =============================================================================
// Types
// =============================================================================

export type DiagramFramePanelProps = {
  readonly shape: GraphicFrame;
  readonly onChange: (shape: GraphicFrame) => void;
};

// =============================================================================
// Component
// =============================================================================

/**
 * GraphicFrame (diagram/SmartArt) editor panel.
 *
 * Displays editors for:
 * - Identity (NonVisual properties)
 * - Transform
 * - Diagram content
 */
export function DiagramFramePanel({
  shape,
  onChange,
}: DiagramFramePanelProps) {
  const diagramData =
    shape.content.type === "diagram" ? shape.content.data : undefined;

  const handleDataModelChange = (dataModel: DiagramDataModel) => {
    if (shape.content.type !== "diagram") {
      return;
    }
    onChange({
      ...shape,
      content: {
        ...shape.content,
        data: {
          ...shape.content.data,
          dataModel,
        },
      },
    });
  };

  const renderDiagramContent = () => {
    if (diagramData?.dataModel) {
      return (
        <DiagramEditor
          value={diagramData.dataModel}
          onChange={handleDataModelChange}
        />
      );
    }

    if (diagramData?.parsedContent) {
      return (
        <div
          style={{
            padding: "12px",
            textAlign: "center",
            color: "var(--text-tertiary, #737373)",
            fontSize: "12px",
          }}
        >
          Diagram with {diagramData.parsedContent.shapes.length} shapes (data
          model not available)
        </div>
      );
    }

    return (
      <div
        style={{
          padding: "12px",
          textAlign: "center",
          color: "var(--text-tertiary, #737373)",
          fontSize: "12px",
        }}
      >
        Diagram content not loaded
      </div>
    );
  };

  return (
    <>
      <Accordion title="Identity" defaultExpanded={false}>
        <NonVisualPropertiesEditor
          value={shape.nonVisual}
          onChange={(nv) => onChange({ ...shape, nonVisual: nv })}
        />
      </Accordion>

      <Accordion title="Transform" defaultExpanded>
        {shape.transform && (
          <TransformEditor
            value={shape.transform}
            onChange={(transform) => onChange({ ...shape, transform })}
          />
        )}
      </Accordion>

      <Accordion title="Diagram" defaultExpanded>
        {renderDiagramContent()}
      </Accordion>
    </>
  );
}

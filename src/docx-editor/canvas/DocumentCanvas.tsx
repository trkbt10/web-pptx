/**
 * @file Document canvas component
 *
 * Main canvas for rendering and editing DOCX documents.
 * Provides the visual representation of the document body.
 */

import {
  useCallback,
  useMemo,
  type ReactNode,
  type CSSProperties,
  type MouseEvent,
} from "react";
import type { DocxBlockContent } from "../../docx/domain/document";
import { useDocumentEditorOptional } from "../context/document/DocumentEditorContext";

// =============================================================================
// Types
// =============================================================================

/**
 * Element identifier type for document elements.
 */
export type ElementId = string;

export type DocumentCanvasProps = {
  /** Callback when element is clicked */
  readonly onElementClick?: (elementId: ElementId, event: MouseEvent) => void;
  /** Callback when element is double-clicked */
  readonly onElementDoubleClick?: (elementId: ElementId) => void;
  /** Callback when canvas background is clicked */
  readonly onCanvasClick?: (event: MouseEvent) => void;
  /** Whether to show page break indicators */
  readonly showPageBreaks?: boolean;
  /** Page width in pixels (default: 816 = 8.5" at 96dpi) */
  readonly pageWidth?: number;
  /** Page margin in pixels */
  readonly pageMargin?: number;
  /** Render function for block content */
  readonly renderBlockContent?: (
    element: DocxBlockContent,
    index: number
  ) => ReactNode;
  /** Custom class name */
  readonly className?: string;
  /** Custom style */
  readonly style?: CSSProperties;
};

// =============================================================================
// Constants
// =============================================================================

/** Default page width in pixels (8.5 inches at 96 DPI) */
const DEFAULT_PAGE_WIDTH = 816;

/** Default page margin in pixels */
const DEFAULT_PAGE_MARGIN = 96;

/** Page shadow for visual effect */
const PAGE_SHADOW = "0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)";

// =============================================================================
// Component
// =============================================================================

/**
 * Document canvas for DOCX editing.
 *
 * Features:
 * - Renders document body content
 * - Page-like visual layout
 * - Click handling for element selection
 * - Optional page break indicators
 */
export function DocumentCanvas({
  onElementClick,
  onElementDoubleClick,
  onCanvasClick,
  showPageBreaks = false,
  pageWidth = DEFAULT_PAGE_WIDTH,
  pageMargin = DEFAULT_PAGE_MARGIN,
  renderBlockContent,
  className,
  style,
}: DocumentCanvasProps) {
  const editorContext = useDocumentEditorOptional();

  // Get document from context, or use empty array for standalone usage
  const content = useMemo(() => {
    return editorContext?.document.body.content ?? [];
  }, [editorContext?.document.body.content]);

  // Get selected element IDs
  const selectedIds = useMemo(() => {
    return editorContext?.state.selection.element.selectedIds ?? [];
  }, [editorContext?.state.selection.element.selectedIds]);

  // Handle canvas background click
  const handleCanvasClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      // Only trigger if clicking directly on canvas (not bubbled from content)
      if (e.target === e.currentTarget) {
        onCanvasClick?.(e);
      }
    },
    [onCanvasClick]
  );

  // Handle element click
  const handleElementClick = useCallback(
    (elementId: ElementId, event: MouseEvent) => {
      event.stopPropagation();
      onElementClick?.(elementId, event);
    },
    [onElementClick]
  );

  // Handle element double-click
  const handleElementDoubleClick = useCallback(
    (elementId: ElementId, event: MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();
      onElementDoubleClick?.(elementId);
    },
    [onElementDoubleClick]
  );

  // Container style (centers the page)
  const containerStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "20px",
    minHeight: "100%",
    ...style,
  };

  // Page style (white paper with shadow)
  const pageStyle: CSSProperties = {
    width: pageWidth,
    minHeight: 1056, // 11 inches at 96 DPI
    backgroundColor: "#ffffff",
    boxShadow: PAGE_SHADOW,
    padding: pageMargin,
    boxSizing: "border-box",
  };

  // Default render function for block content
  const defaultRenderBlockContent = (
    element: DocxBlockContent,
    index: number
  ): ReactNode => {
    const elementId = String(index);
    const isSelected = selectedIds.includes(elementId);

    // Placeholder rendering - will be replaced by proper renderers in T1-2, T1-3
    const elementStyle: CSSProperties = {
      padding: "4px",
      marginBottom: "4px",
      cursor: "pointer",
      outline: isSelected ? "2px solid #0066cc" : "none",
      backgroundColor: isSelected ? "rgba(0, 102, 204, 0.05)" : "transparent",
    };

    return (
      <div
        key={elementId}
        style={elementStyle}
        onClick={(e) => handleElementClick(elementId, e)}
        onDoubleClick={(e) => handleElementDoubleClick(elementId, e)}
        data-element-id={elementId}
      >
        {renderPlaceholderContent(element)}
      </div>
    );
  };

  return (
    <div className={className} style={containerStyle} onClick={handleCanvasClick}>
      <div style={pageStyle}>
        {content.map((element, index) => {
          if (renderBlockContent) {
            return renderBlockContent(element, index);
          }
          return defaultRenderBlockContent(element, index);
        })}
        {content.length === 0 && (
          <div
            style={{
              color: "#999",
              fontStyle: "italic",
              textAlign: "center",
              padding: "40px",
            }}
          >
            Empty document
          </div>
        )}
        {showPageBreaks && (
          <div
            style={{
              borderTop: "1px dashed #ccc",
              margin: "20px 0",
              position: "relative",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: "-10px",
                left: "50%",
                transform: "translateX(-50%)",
                backgroundColor: "#e8e8e8",
                padding: "0 8px",
                fontSize: "10px",
                color: "#666",
              }}
            >
              Page Break
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Render placeholder content for a block element.
 * This is temporary - proper renderers will be implemented in T1-2, T1-3.
 */
function renderPlaceholderContent(element: DocxBlockContent): ReactNode {
  switch (element.type) {
    case "paragraph": {
      // Extract text from runs
      const text = element.content
        .filter((c): c is Extract<typeof c, { type: "run" }> => c.type === "run")
        .flatMap((run) => run.content)
        .map((c) => {
          if (c.type === "text") {
            return c.value;
          }
          if (c.type === "tab") {
            return "\t";
          }
          if (c.type === "break") {
            return "\n";
          }
          return "";
        })
        .join("");

      return (
        <p style={{ margin: 0, minHeight: "1em" }}>{text || "\u00A0"}</p>
      );
    }
    case "table": {
      return (
        <div
          style={{
            border: "1px solid #ccc",
            padding: "8px",
            textAlign: "center",
            color: "#666",
          }}
        >
          [Table: {element.rows.length} rows]
        </div>
      );
    }
    case "sectionBreak": {
      return (
        <div
          style={{
            borderTop: "1px dashed #999",
            margin: "8px 0",
            fontSize: "10px",
            color: "#666",
            textAlign: "center",
          }}
        >
          Section Break
        </div>
      );
    }
    default: {
      return (
        <div style={{ color: "#999", fontSize: "12px" }}>
          [Unknown element type]
        </div>
      );
    }
  }
}

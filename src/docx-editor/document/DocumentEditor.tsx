/**
 * @file DocumentEditor main component
 *
 * Complete DOCX editor integrating all components:
 * - DocumentCanvas for content rendering
 * - SelectionOverlay for visual selection
 * - DocxTextEditController for text editing
 * - DocumentToolbar for editing tools
 * - SelectedElementPanel / DocumentInfoPanel for property inspection
 */

import {
  useRef,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
  type CSSProperties,
  type MouseEvent,
} from "react";
import type { DocxDocument } from "../../docx/domain/document";
import { injectCSSVariables, removeCSSVariables } from "../../office-editor-components/design-tokens";
import type { DocxParagraph } from "../../docx/domain/paragraph";
import type { TextPosition } from "../context/document/state";
import {
  DocumentEditorProvider,
  useDocumentEditor,
} from "../context/document/DocumentEditorContext";
import { DocumentCanvas, type ElementId } from "../canvas/DocumentCanvas";
import { ParagraphRenderer } from "../canvas/ParagraphRenderer";
import { TableRenderer } from "../canvas/TableRenderer";
import { SelectionOverlay } from "../canvas/SelectionOverlay";
import { DocxTextEditController } from "../text-edit/DocxTextEditController";
import { DocumentToolbar } from "../panels/DocumentToolbar";
import { SelectedElementPanel } from "../panels/SelectedElementPanel";
import { DocumentInfoPanel } from "../panels/DocumentInfoPanel";
import { useKeyboardShortcuts } from "./hooks/use-keyboard-shortcuts";
import type { DocxBlockContent } from "../../docx/domain/document";

// =============================================================================
// Types
// =============================================================================

export type DocumentEditorProps = {
  /** Initial document to edit */
  readonly initialDocument: DocxDocument;
  /** Show toolbar */
  readonly showToolbar?: boolean;
  /** Show inspector panel */
  readonly showInspector?: boolean;
  /** Whether the document is editable */
  readonly editable?: boolean;
  /** Custom class name */
  readonly className?: string;
  /** Custom style */
  readonly style?: CSSProperties;
  /** Callback when document changes */
  readonly onDocumentChange?: (document: DocxDocument) => void;
};

// =============================================================================
// Constants
// =============================================================================

const CONTAINER_STYLE: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  height: "100%",
  overflow: "hidden",
};

const TOOLBAR_STYLE: CSSProperties = {
  borderBottom: "1px solid var(--border-subtle)",
  backgroundColor: "var(--bg-secondary)",
  flexShrink: 0,
};

const CONTENT_STYLE: CSSProperties = {
  display: "flex",
  flex: 1,
  overflow: "hidden",
};

const CANVAS_CONTAINER_STYLE: CSSProperties = {
  flex: 1,
  overflow: "auto",
  backgroundColor: "var(--bg-tertiary)",
  position: "relative",
};

const INSPECTOR_STYLE: CSSProperties = {
  width: 280,
  borderLeft: "1px solid var(--border-subtle)",
  backgroundColor: "var(--bg-secondary)",
  overflow: "auto",
  flexShrink: 0,
};

// =============================================================================
// Inner Editor Component
// =============================================================================

type EditorContentProps = {
  readonly showToolbar: boolean;
  readonly showInspector: boolean;
  readonly onDocumentChange?: (document: DocxDocument) => void;
};

function EditorContent({
  showToolbar,
  showInspector,
  onDocumentChange,
}: EditorContentProps): ReactNode {
  const {
    state,
    dispatch,
    document,
    textEdit,
  } = useDocumentEditor();

  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Register keyboard shortcuts
  useKeyboardShortcuts(dispatch, state);

  // Notify on document change
  useEffect(() => {
    onDocumentChange?.(document);
  }, [document, onDocumentChange]);

  // Handle element click
  const handleElementClick = useCallback(
    (elementId: ElementId, event: MouseEvent) => {
      const addToSelection = event.shiftKey;
      const toggle = event.metaKey || event.ctrlKey;

      dispatch({
        type: "SELECT_ELEMENT",
        elementId,
        addToSelection,
        toggle,
      });
    },
    [dispatch]
  );

  // Handle element double-click (start text editing)
  const handleElementDoubleClick = useCallback(
    (elementId: ElementId) => {
      const index = parseInt(elementId, 10);
      if (Number.isNaN(index)) {
        return;
      }

      const element = document.body.content[index];
      if (element?.type === "paragraph") {
        dispatch({
          type: "START_TEXT_EDIT",
          elementId,
        });
      }
    },
    [dispatch, document.body.content]
  );

  // Handle canvas background click
  const handleCanvasClick = useCallback(
    (event: MouseEvent) => {
      if (event.target === event.currentTarget) {
        dispatch({ type: "CLEAR_ELEMENT_SELECTION" });
      }
    },
    [dispatch]
  );

  // Handle text change during editing
  const handleTextChange = useCallback(
    (paragraph: DocxParagraph) => {
      if (!textEdit.isEditing || textEdit.editingElementId === undefined) {
        return;
      }

      const index = parseInt(textEdit.editingElementId, 10);
      if (Number.isNaN(index)) {
        return;
      }

      // Create a new document with the updated paragraph
      const newContent = [...document.body.content];
      newContent[index] = paragraph;
      const newDocument: DocxDocument = {
        ...document,
        body: {
          ...document.body,
          content: newContent,
        },
      };

      dispatch({
        type: "SET_DOCUMENT",
        document: newDocument,
      });
    },
    [dispatch, textEdit, document]
  );

  // Handle selection change during editing
  const handleSelectionChange = useCallback(
    (selection: { start: { elementIndex: number; charOffset: number }; end: { elementIndex: number; charOffset: number } }) => {
      // Convert to TextPosition format
      const startPos: TextPosition = {
        paragraphIndex: selection.start.elementIndex,
        charOffset: selection.start.charOffset,
      };
      const endPos: TextPosition = {
        paragraphIndex: selection.end.elementIndex,
        charOffset: selection.end.charOffset,
      };

      dispatch({
        type: "SET_TEXT_SELECTION",
        start: startPos,
        end: endPos,
      });
    },
    [dispatch]
  );

  // Handle exit text editing
  const handleExitTextEdit = useCallback(() => {
    dispatch({ type: "END_TEXT_EDIT" });
  }, [dispatch]);

  // Get editing paragraph bounds
  const getEditingBounds = useCallback((): DOMRect => {
    if (!textEdit.isEditing || textEdit.editingElementId === undefined) {
      return new DOMRect(0, 0, 0, 0);
    }

    const container = canvasContainerRef.current;
    if (!container) {
      return new DOMRect(0, 0, 0, 0);
    }

    const element = container.querySelector(
      `[data-element-id="${textEdit.editingElementId}"]`
    );
    if (!element) {
      return new DOMRect(0, 0, 0, 0);
    }

    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    return new DOMRect(
      elementRect.left - containerRect.left + container.scrollLeft,
      elementRect.top - containerRect.top + container.scrollTop,
      elementRect.width,
      elementRect.height
    );
  }, [textEdit]);

  // Get editing paragraph
  const editingParagraph = useMemo((): DocxParagraph | undefined => {
    if (!textEdit.isEditing || textEdit.editingElementId === undefined) {
      return undefined;
    }

    const index = parseInt(textEdit.editingElementId, 10);
    if (Number.isNaN(index)) {
      return undefined;
    }

    const element = document.body.content[index];
    if (element?.type !== "paragraph") {
      return undefined;
    }

    return element;
  }, [textEdit, document.body.content]);

  // Render block content
  const renderBlockContent = useCallback(
    (element: DocxBlockContent, index: number): ReactNode => {
      const elementId = String(index);
      const isSelected = state.selection.element.selectedIds.includes(elementId);
      const isEditing = textEdit.isEditing && textEdit.editingElementId === elementId;

      if (element.type === "paragraph") {
        return (
          <ParagraphRenderer
            key={elementId}
            paragraph={element}
            elementId={elementId}
            isSelected={isSelected}
            isEditing={isEditing}
            onClick={(e) => handleElementClick(elementId, e)}
            onDoubleClick={() => handleElementDoubleClick(elementId)}
          />
        );
      }

      if (element.type === "table") {
        return (
          <TableRenderer
            key={elementId}
            table={element}
            elementId={elementId}
            isSelected={isSelected}
            onClick={(e) => handleElementClick(elementId, e)}
          />
        );
      }

      // Section break or unknown type
      if (element.type === "sectionBreak") {
        return (
          <div
            key={elementId}
            style={{
              borderTop: "1px dashed var(--border-strong)",
              margin: "var(--spacing-sm) 0",
              fontSize: "var(--font-size-xs)",
              color: "var(--text-secondary)",
              textAlign: "center",
            }}
            data-element-id={elementId}
          >
            Section Break
          </div>
        );
      }

      return null;
    },
    [
      state.selection.element.selectedIds,
      textEdit.isEditing,
      textEdit.editingElementId,
      handleElementClick,
      handleElementDoubleClick,
    ]
  );

  return (
    <div style={CONTAINER_STYLE}>
      {/* Toolbar */}
      {showToolbar && (
        <div style={TOOLBAR_STYLE}>
          <DocumentToolbar />
        </div>
      )}

      {/* Main content area */}
      <div style={CONTENT_STYLE}>
        {/* Canvas container */}
        <div
          ref={canvasContainerRef}
          style={CANVAS_CONTAINER_STYLE}
        >
          <DocumentCanvas
            onElementClick={handleElementClick}
            onElementDoubleClick={handleElementDoubleClick}
            onCanvasClick={handleCanvasClick}
            renderBlockContent={renderBlockContent}
          />

          {/* Selection overlay */}
          <SelectionOverlay
            containerRef={canvasContainerRef}
            selection={state.selection}
            textEdit={textEdit}
          />

          {/* Text edit controller */}
          {textEdit.isEditing &&
            textEdit.editingElementId !== undefined &&
            editingParagraph && (
              <DocxTextEditController
                editingElementId={textEdit.editingElementId}
                paragraph={editingParagraph}
                bounds={getEditingBounds()}
                onTextChange={handleTextChange}
                onSelectionChange={handleSelectionChange}
                onExit={handleExitTextEdit}
              />
            )}
        </div>

        {/* Inspector panel */}
        {showInspector && (
          <div style={INSPECTOR_STYLE}>
            <SelectedElementPanel />
            <DocumentInfoPanel />
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Complete DOCX document editor.
 *
 * Features:
 * - Document rendering with paragraph and table support
 * - Element selection and multi-select
 * - Inline text editing with IME support
 * - Keyboard shortcuts
 * - Toolbar for common operations
 * - Inspector panels for property editing
 */
export function DocumentEditor({
  initialDocument,
  showToolbar = true,
  showInspector = true,
  editable = true,
  className,
  style,
  onDocumentChange,
}: DocumentEditorProps): ReactNode {
  const containerRef = useRef<HTMLDivElement>(null);

  // Inject CSS variables for design tokens
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    injectCSSVariables(container);
    return () => {
      removeCSSVariables(container);
    };
  }, []);

  const containerStyle = useMemo<CSSProperties>(
    () => ({
      width: "100%",
      height: "100%",
      ...style,
    }),
    [style]
  );

  return (
    <DocumentEditorProvider initialDocument={initialDocument}>
      <div ref={containerRef} className={className} style={containerStyle}>
        <EditorContent
          showToolbar={showToolbar && editable}
          showInspector={showInspector}
          onDocumentChange={onDocumentChange}
        />
      </div>
    </DocumentEditorProvider>
  );
}

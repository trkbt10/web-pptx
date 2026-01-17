/**
 * @file DOCX Text Edit Controller
 *
 * Coordinator for inline text editing in DOCX documents.
 * Manages the textarea + overlay pattern for text input.
 *
 * Phase 1: Controller logic only
 * Phase 2: Child components (DocxTextInputFrame, DocxTextOverlay, CursorCaret)
 */

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
  type CSSProperties,
  type ChangeEvent,
  type KeyboardEvent,
  type CompositionEvent,
} from "react";
import type { DocxParagraph } from "../../docx/domain/paragraph";
import type { ElementId } from "../canvas/DocumentCanvas";
import {
  type DocxCursorPosition,
  getPlainTextFromParagraph,
  offsetToDocxCursorPosition,
  docxCursorPositionToOffset,
} from "./cursor";
import { mergeTextIntoParagraph } from "./text-merge";

// =============================================================================
// Types
// =============================================================================

export type DocxTextEditControllerProps = {
  /** Element ID being edited */
  readonly editingElementId: ElementId;
  /** Paragraph being edited */
  readonly paragraph: DocxParagraph;
  /** Bounding rect for positioning */
  readonly bounds: DOMRect;
  /** Initial cursor position */
  readonly initialCursorPosition?: DocxCursorPosition;
  /** Called when text changes */
  readonly onTextChange: (paragraph: DocxParagraph) => void;
  /** Called when selection changes */
  readonly onSelectionChange: (selection: {
    start: DocxCursorPosition;
    end: DocxCursorPosition;
  }) => void;
  /** Called when editing should exit */
  readonly onExit: () => void;
};

/**
 * Local state for text editing.
 */
export type TextEditLocalState = {
  /** Current text value (flat string for textarea) */
  readonly currentText: string;
  /** Current paragraph (structured document model) */
  readonly currentParagraph: DocxParagraph;
  /** Selection start offset in textarea */
  readonly selectionStart: number;
  /** Selection end offset in textarea */
  readonly selectionEnd: number;
  /** Whether IME composition is active */
  readonly isComposing: boolean;
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create initial local state from paragraph.
 */
function createInitialState(
  paragraph: DocxParagraph,
  initialCursorPosition?: DocxCursorPosition
): TextEditLocalState {
  const text = getPlainTextFromParagraph(paragraph);
  const offset = initialCursorPosition?.charOffset ?? text.length;

  return {
    currentText: text,
    currentParagraph: paragraph,
    selectionStart: offset,
    selectionEnd: offset,
    isComposing: false,
  };
}

// =============================================================================
// Component
// =============================================================================

/**
 * Text edit controller for DOCX paragraphs.
 *
 * Coordinates:
 * - Hidden textarea for input capture
 * - Text overlay rendering (Phase 2)
 * - Cursor caret display (Phase 2)
 * - IME composition support
 */
export function DocxTextEditController({
  editingElementId,
  paragraph,
  bounds,
  initialCursorPosition,
  onTextChange,
  onSelectionChange,
  onExit,
}: DocxTextEditControllerProps): ReactNode {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Local editing state
  const [state, setState] = useState<TextEditLocalState>(() =>
    createInitialState(paragraph, initialCursorPosition)
  );

  // Track if we've initialized
  const initializedRef = useRef(false);

  // Focus textarea on mount
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea && !initializedRef.current) {
      textarea.focus();
      textarea.setSelectionRange(state.selectionStart, state.selectionEnd);
      initializedRef.current = true;
    }
  }, [state.selectionStart, state.selectionEnd]);

  // Convert selection to cursor positions and notify
  const notifySelectionChange = useCallback(
    (start: number, end: number) => {
      // For a paragraph, we use a simple content array
      const content = [paragraph];
      const startPos = offsetToDocxCursorPosition(content, start);
      const endPos = offsetToDocxCursorPosition(content, end);

      // Adjust to be relative to this paragraph
      const adjustedStart: DocxCursorPosition = {
        elementIndex: 0,
        charOffset: start,
      };
      const adjustedEnd: DocxCursorPosition = {
        elementIndex: 0,
        charOffset: end,
      };

      onSelectionChange({ start: adjustedStart, end: adjustedEnd });
    },
    [onSelectionChange, paragraph]
  );

  // Handle text input change
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      const newText = event.target.value;
      const newParagraph = mergeTextIntoParagraph(paragraph, newText);

      setState((prev) => ({
        ...prev,
        currentText: newText,
        currentParagraph: newParagraph,
        selectionStart: event.target.selectionStart ?? newText.length,
        selectionEnd: event.target.selectionEnd ?? newText.length,
      }));

      onTextChange(newParagraph);
    },
    [paragraph, onTextChange]
  );

  // Handle selection change in textarea
  const handleSelect = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea || state.isComposing) {
      return;
    }

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;

    setState((prev) => ({
      ...prev,
      selectionStart: start,
      selectionEnd: end,
    }));

    notifySelectionChange(start, end);
  }, [state.isComposing, notifySelectionChange]);

  // Handle key events
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      // Don't handle keys during IME composition
      if (state.isComposing) {
        return;
      }

      // Escape exits text editing
      if (event.key === "Escape") {
        event.preventDefault();
        onExit();
        return;
      }

      // Enter could be handled for paragraph splitting in future
      // For now, allow normal behavior
    },
    [state.isComposing, onExit]
  );

  // IME Composition handlers
  const handleCompositionStart = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isComposing: true,
    }));
  }, []);

  const handleCompositionUpdate = useCallback(
    (_event: CompositionEvent<HTMLTextAreaElement>) => {
      // Composition text is handled by the textarea
      // Could track composition text separately for overlay rendering
    },
    []
  );

  const handleCompositionEnd = useCallback(
    (event: CompositionEvent<HTMLTextAreaElement>) => {
      setState((prev) => ({
        ...prev,
        isComposing: false,
      }));

      // After composition ends, update the paragraph
      const textarea = textareaRef.current;
      if (textarea) {
        const newText = textarea.value;
        const newParagraph = mergeTextIntoParagraph(paragraph, newText);

        setState((prev) => ({
          ...prev,
          currentText: newText,
          currentParagraph: newParagraph,
          selectionStart: textarea.selectionStart ?? newText.length,
          selectionEnd: textarea.selectionEnd ?? newText.length,
        }));

        onTextChange(newParagraph);
      }
    },
    [paragraph, onTextChange]
  );

  // Textarea styles (hidden but functional)
  const textareaStyle: CSSProperties = useMemo(
    () => ({
      position: "absolute",
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
      height: bounds.height,
      // Make textarea invisible but functional
      opacity: 0,
      // Ensure it's still interactive
      pointerEvents: "auto",
      // Match text styling to get correct cursor positioning
      fontSize: 12,
      fontFamily: "sans-serif",
      lineHeight: 1.5,
      padding: 0,
      margin: 0,
      border: "none",
      outline: "none",
      resize: "none",
      overflow: "hidden",
      whiteSpace: "pre-wrap",
      wordWrap: "break-word",
    }),
    [bounds]
  );

  // Container styles
  const containerStyle: CSSProperties = useMemo(
    () => ({
      position: "absolute",
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
      height: bounds.height,
      pointerEvents: "none",
    }),
    [bounds]
  );

  return (
    <div
      style={containerStyle}
      data-testid="docx-text-edit-controller"
      data-editing-element={editingElementId}
    >
      {/* Hidden textarea for input capture */}
      <textarea
        ref={textareaRef}
        data-testid="docx-text-edit-textarea"
        style={textareaStyle}
        value={state.currentText}
        onChange={handleChange}
        onSelect={handleSelect}
        onKeyDown={handleKeyDown}
        onCompositionStart={handleCompositionStart}
        onCompositionUpdate={handleCompositionUpdate}
        onCompositionEnd={handleCompositionEnd}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />

      {/* Phase 2: DocxTextOverlay will render here */}
      {/* Phase 2: CursorCaret will render here */}
    </div>
  );
}

// =============================================================================
// Exports for Testing
// =============================================================================

export { createInitialState };

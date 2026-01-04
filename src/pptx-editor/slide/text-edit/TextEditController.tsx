/**
 * @file Text Edit Controller Component
 *
 * Provides a hybrid text editing experience:
 * - Hidden textarea captures input and tracks cursor/selection
 * - Visual cursor is rendered on top of SVG text
 * - Syncs input state reactively with the visual display
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import type { TextBody } from "../../../pptx/domain";
import type { LayoutResult } from "../../../pptx/render/text-layout";
import {
  getPlainText,
  offsetToCursorPosition,
  cursorPositionToCoordinates,
  selectionToRects,
  type CursorCoordinates,
  type SelectionRect,
} from "./cursor";
import type { TextEditBounds } from "./state";
import { colorTokens } from "../../ui/design-tokens";

// =============================================================================
// Types
// =============================================================================

export type TextEditControllerProps = {
  /** Bounds of the text editing area */
  readonly bounds: TextEditBounds;
  /** Text body being edited */
  readonly textBody: TextBody;
  /** Layout result for cursor positioning */
  readonly layoutResult: LayoutResult | undefined;
  /** Slide dimensions for positioning */
  readonly slideWidth: number;
  readonly slideHeight: number;
  /** Called when text changes */
  readonly onChange: (newText: string) => void;
  /** Called when editing is complete */
  readonly onComplete: (newText: string) => void;
  /** Called when editing is cancelled */
  readonly onCancel: () => void;
};

export type CursorState = {
  /** Cursor coordinates (or undefined if no layout) */
  readonly cursor: CursorCoordinates | undefined;
  /** Selection rectangles */
  readonly selectionRects: readonly SelectionRect[];
  /** Whether cursor should blink */
  readonly isBlinking: boolean;
};

// =============================================================================
// Styles
// =============================================================================

const hiddenTextareaStyle: CSSProperties = {
  position: "absolute",
  left: 0,
  top: 0,
  width: "100%",
  height: "100%",
  opacity: 0,
  cursor: "text",
  resize: "none",
  border: "none",
  outline: "none",
  padding: 0,
  margin: 0,
  overflow: "hidden",
  whiteSpace: "pre-wrap",
  wordWrap: "break-word",
  // Important: make sure it's focusable but invisible
  pointerEvents: "auto",
};

function getContainerStyle(
  bounds: TextEditBounds,
  slideWidth: number,
  slideHeight: number,
): CSSProperties {
  const left = ((bounds.x as number) / slideWidth) * 100;
  const top = ((bounds.y as number) / slideHeight) * 100;
  const width = ((bounds.width as number) / slideWidth) * 100;
  const height = ((bounds.height as number) / slideHeight) * 100;

  return {
    position: "absolute",
    left: `${left}%`,
    top: `${top}%`,
    width: `${width}%`,
    height: `${height}%`,
    transform: bounds.rotation !== 0 ? `rotate(${bounds.rotation}deg)` : undefined,
    transformOrigin: "center center",
    boxSizing: "border-box",
    border: `2px solid ${colorTokens.selection.primary}`,
    borderRadius: "2px",
    backgroundColor: "transparent",
    zIndex: 1000,
    overflow: "visible",
  };
}

// =============================================================================
// Component
// =============================================================================

/**
 * Text edit controller with hidden textarea and visual cursor.
 */
export function TextEditController({
  bounds,
  textBody,
  layoutResult,
  slideWidth,
  slideHeight,
  onChange,
  onComplete,
  onCancel,
}: TextEditControllerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursorState, setCursorState] = useState<CursorState>({
    cursor: undefined,
    selectionRects: [],
    isBlinking: true,
  });
  const [currentText, setCurrentText] = useState(() => getPlainText(textBody));
  const initialTextRef = useRef(getPlainText(textBody));

  // Focus textarea on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, []);

  // Update cursor position when selection changes
  const updateCursorPosition = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea || !layoutResult) {
      return;
    }

    const { selectionStart, selectionEnd } = textarea;
    const hasSelection = selectionStart !== selectionEnd;

    if (hasSelection) {
      // Selection mode
      const startPos = offsetToCursorPosition(textBody, selectionStart);
      const endPos = offsetToCursorPosition(textBody, selectionEnd);
      const rects = selectionToRects({ start: startPos, end: endPos }, layoutResult);

      setCursorState({
        cursor: undefined,
        selectionRects: rects,
        isBlinking: false,
      });
    } else {
      // Cursor mode
      const cursorPos = offsetToCursorPosition(textBody, selectionStart);
      const coords = cursorPositionToCoordinates(cursorPos, layoutResult);

      setCursorState({
        cursor: coords,
        selectionRects: [],
        isBlinking: true,
      });
    }
  }, [textBody, layoutResult]);

  // Handle selection changes
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const handleSelectionChange = () => {
      updateCursorPosition();
    };

    // Listen for selection changes
    document.addEventListener("selectionchange", handleSelectionChange);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [updateCursorPosition]);

  // Update cursor on layout changes
  useEffect(() => {
    updateCursorPosition();
  }, [layoutResult, updateCursorPosition]);

  // Handle text changes
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const newText = e.target.value;
      setCurrentText(newText);
      onChange(newText);
      // Defer cursor update to after React processes the change
      requestAnimationFrame(() => {
        updateCursorPosition();
      });
    },
    [onChange, updateCursorPosition],
  );

  // Handle key events
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onComplete(currentText);
      }
    },
    [currentText, onCancel, onComplete],
  );

  // Handle clicks outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const container = textareaRef.current?.parentElement;
      if (container && !container.contains(e.target as Node)) {
        if (currentText !== initialTextRef.current) {
          onComplete(currentText);
        } else {
          onCancel();
        }
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [currentText, onComplete, onCancel]);

  const containerStyle = getContainerStyle(bounds, slideWidth, slideHeight);

  return (
    <div style={containerStyle}>
      {/* Hidden textarea for input */}
      <textarea
        ref={textareaRef}
        value={currentText}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onSelect={updateCursorPosition}
        onClick={updateCursorPosition}
        style={hiddenTextareaStyle}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
      />

      {/* Cursor overlay */}
      <CursorOverlay
        cursor={cursorState.cursor}
        selectionRects={cursorState.selectionRects}
        isBlinking={cursorState.isBlinking}
        bounds={bounds}
      />
    </div>
  );
}

// =============================================================================
// Cursor Overlay Component
// =============================================================================

type CursorOverlayProps = {
  readonly cursor: CursorCoordinates | undefined;
  readonly selectionRects: readonly SelectionRect[];
  readonly isBlinking: boolean;
  readonly bounds: TextEditBounds;
};

/**
 * Renders visual cursor and selection on top of SVG text.
 */
function CursorOverlay({
  cursor,
  selectionRects,
  isBlinking,
  bounds,
}: CursorOverlayProps) {
  const [visible, setVisible] = useState(true);

  // Blink effect
  useEffect(() => {
    if (!isBlinking || !cursor) {
      setVisible(true);
      return;
    }

    const interval = setInterval(() => {
      setVisible((v) => !v);
    }, 530); // Standard cursor blink rate

    return () => {
      clearInterval(interval);
    };
  }, [isBlinking, cursor]);

  // Reset visibility when cursor changes
  useEffect(() => {
    setVisible(true);
  }, [cursor?.x, cursor?.y]);

  const boundsWidth = bounds.width as number;
  const boundsHeight = bounds.height as number;

  return (
    <svg
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        overflow: "visible",
      }}
      viewBox={`0 0 ${boundsWidth} ${boundsHeight}`}
      preserveAspectRatio="none"
    >
      {/* Selection highlights */}
      {selectionRects.map((rect, index) => (
        <rect
          key={index}
          x={rect.x as number}
          y={rect.y as number}
          width={rect.width as number}
          height={rect.height as number}
          fill={colorTokens.selection.primary}
          fillOpacity={0.3}
        />
      ))}

      {/* Cursor caret */}
      {cursor && visible && (
        <line
          x1={cursor.x as number}
          y1={cursor.y as number}
          x2={cursor.x as number}
          y2={(cursor.y as number) + (cursor.height as number)}
          stroke="#000"
          strokeWidth={1.5}
        />
      )}
    </svg>
  );
}

/**
 * @file Slide thumbnail panel
 *
 * Left panel for slide management: navigation, add, delete, duplicate, reorder.
 */

import { useCallback, useState, useRef, type CSSProperties } from "react";
import type { Slide } from "../../pptx/domain";
import type { SlideWithId, SlideId } from "./types";
import { usePresentationEditor } from "./context";

// =============================================================================
// Types
// =============================================================================

export type SlideThumbnailPanelProps = {
  /** Optional render function for slide thumbnail */
  readonly renderThumbnail?: (slide: SlideWithId, index: number) => React.ReactNode;
};

// =============================================================================
// Styles
// =============================================================================

const panelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  backgroundColor: "var(--bg-secondary, #1a1a1a)",
  borderRight: "1px solid var(--border-subtle, #333)",
  overflow: "hidden",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 12px",
  borderBottom: "1px solid var(--border-subtle, #333)",
  backgroundColor: "var(--bg-tertiary, #0a0a0a)",
};

const headerTitleStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "var(--text-secondary, #888)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const buttonGroupStyle: CSSProperties = {
  display: "flex",
  gap: "4px",
};

const iconButtonStyle: CSSProperties = {
  width: "24px",
  height: "24px",
  padding: 0,
  border: "none",
  borderRadius: "4px",
  backgroundColor: "transparent",
  color: "var(--text-secondary, #888)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "14px",
  transition: "all 0.15s ease",
};

const iconButtonHoverStyle: CSSProperties = {
  ...iconButtonStyle,
  backgroundColor: "var(--bg-hover, #333)",
  color: "var(--text-primary, #fff)",
};

const iconButtonDisabledStyle: CSSProperties = {
  ...iconButtonStyle,
  opacity: 0.4,
  cursor: "not-allowed",
};

const listStyle: CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "8px",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const thumbnailWrapperStyle: CSSProperties = {
  position: "relative",
  cursor: "pointer",
  borderRadius: "4px",
  overflow: "hidden",
  transition: "transform 0.15s ease",
};

const thumbnailStyle: CSSProperties = {
  aspectRatio: "16 / 9",
  backgroundColor: "#fff",
  border: "2px solid transparent",
  borderRadius: "4px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
  transition: "border-color 0.15s ease",
  position: "relative",
  overflow: "hidden",
};

const thumbnailActiveStyle: CSSProperties = {
  ...thumbnailStyle,
  borderColor: "var(--accent-blue, #0066cc)",
};

const thumbnailNumberStyle: CSSProperties = {
  position: "absolute",
  top: "4px",
  left: "4px",
  fontSize: "10px",
  fontWeight: 600,
  color: "#fff",
  backgroundColor: "rgba(0,0,0,0.6)",
  padding: "2px 6px",
  borderRadius: "3px",
};

const deleteButtonStyle: CSSProperties = {
  position: "absolute",
  top: "4px",
  right: "4px",
  width: "18px",
  height: "18px",
  padding: 0,
  border: "none",
  borderRadius: "3px",
  backgroundColor: "rgba(0,0,0,0.6)",
  color: "#fff",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  opacity: 0,
  transition: "opacity 0.15s ease",
};

const contextMenuStyle: CSSProperties = {
  position: "fixed",
  backgroundColor: "var(--bg-secondary, #1a1a1a)",
  border: "1px solid var(--border-subtle, #333)",
  borderRadius: "6px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
  padding: "4px 0",
  minWidth: "160px",
  zIndex: 1000,
};

const menuItemStyle: CSSProperties = {
  padding: "8px 12px",
  fontSize: "13px",
  color: "var(--text-primary, #fff)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  transition: "background-color 0.1s ease",
};

const menuItemHoverStyle: CSSProperties = {
  ...menuItemStyle,
  backgroundColor: "var(--bg-hover, #333)",
};

const menuItemDangerStyle: CSSProperties = {
  ...menuItemStyle,
  color: "var(--accent-red, #ef4444)",
};

const menuSeparatorStyle: CSSProperties = {
  height: "1px",
  backgroundColor: "var(--border-subtle, #333)",
  margin: "4px 0",
};

const dragIndicatorStyle: CSSProperties = {
  position: "absolute",
  left: 0,
  right: 0,
  height: "2px",
  backgroundColor: "var(--accent-blue, #0066cc)",
  zIndex: 10,
};

// =============================================================================
// Icon Components
// =============================================================================

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <rect x="4" y="4" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M2 10V3a1 1 0 011-1h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <path d="M2 4h10M5 4V3a1 1 0 011-1h2a1 1 0 011 1v1M4 4v8a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

// =============================================================================
// Context Menu
// =============================================================================

type ContextMenuState = {
  visible: boolean;
  x: number;
  y: number;
  slideId: SlideId | null;
};

function SlideContextMenu({
  state,
  onClose,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  canDelete,
}: {
  state: ContextMenuState;
  onClose: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canDelete: boolean;
}) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  if (!state.visible) return null;

  const handleClick = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 999,
        }}
        onClick={onClose}
      />
      {/* Menu */}
      <div style={{ ...contextMenuStyle, left: state.x, top: state.y }}>
        <div
          style={hoveredItem === "duplicate" ? menuItemHoverStyle : menuItemStyle}
          onClick={() => handleClick(onDuplicate)}
          onMouseEnter={() => setHoveredItem("duplicate")}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <CopyIcon /> Duplicate Slide
        </div>
        <div style={menuSeparatorStyle} />
        <div
          style={{
            ...(hoveredItem === "up" ? menuItemHoverStyle : menuItemStyle),
            opacity: canMoveUp ? 1 : 0.4,
            cursor: canMoveUp ? "pointer" : "not-allowed",
          }}
          onClick={() => canMoveUp && handleClick(onMoveUp)}
          onMouseEnter={() => setHoveredItem("up")}
          onMouseLeave={() => setHoveredItem(null)}
        >
          ↑ Move Up
        </div>
        <div
          style={{
            ...(hoveredItem === "down" ? menuItemHoverStyle : menuItemStyle),
            opacity: canMoveDown ? 1 : 0.4,
            cursor: canMoveDown ? "pointer" : "not-allowed",
          }}
          onClick={() => canMoveDown && handleClick(onMoveDown)}
          onMouseEnter={() => setHoveredItem("down")}
          onMouseLeave={() => setHoveredItem(null)}
        >
          ↓ Move Down
        </div>
        <div style={menuSeparatorStyle} />
        <div
          style={{
            ...(hoveredItem === "delete" ? { ...menuItemDangerStyle, backgroundColor: "var(--bg-hover, #333)" } : menuItemDangerStyle),
            opacity: canDelete ? 1 : 0.4,
            cursor: canDelete ? "pointer" : "not-allowed",
          }}
          onClick={() => canDelete && handleClick(onDelete)}
          onMouseEnter={() => setHoveredItem("delete")}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <TrashIcon /> Delete Slide
        </div>
      </div>
    </>
  );
}

// =============================================================================
// Thumbnail Item
// =============================================================================

function ThumbnailItem({
  slideWithId,
  index,
  isActive,
  totalSlides,
  renderThumbnail,
  onClick,
  onContextMenu,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
  dragPosition,
}: {
  slideWithId: SlideWithId;
  index: number;
  isActive: boolean;
  totalSlides: number;
  renderThumbnail?: (slide: SlideWithId, index: number) => React.ReactNode;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  isDragOver: boolean;
  dragPosition: "before" | "after" | null;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{
        ...thumbnailWrapperStyle,
        position: "relative",
      }}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isDragOver && dragPosition === "before" && (
        <div style={{ ...dragIndicatorStyle, top: -3 }} />
      )}
      <div
        style={isActive ? thumbnailActiveStyle : thumbnailStyle}
        onClick={onClick}
        onContextMenu={onContextMenu}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            onClick();
          }
        }}
        aria-label={`Slide ${index + 1}`}
        aria-selected={isActive}
      >
        {renderThumbnail ? (
          renderThumbnail(slideWithId, index)
        ) : (
          <span style={{ color: "#999", fontSize: "11px" }}>
            {slideWithId.slide.shapes.length} shapes
          </span>
        )}
        <span style={thumbnailNumberStyle}>{index + 1}</span>
        {totalSlides > 1 && (
          <button
            type="button"
            style={{
              ...deleteButtonStyle,
              opacity: isHovered ? 1 : 0,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            aria-label="Delete slide"
          >
            ×
          </button>
        )}
      </div>
      {isDragOver && dragPosition === "after" && (
        <div style={{ ...dragIndicatorStyle, bottom: -3 }} />
      )}
    </div>
  );
}

// =============================================================================
// Icon Button
// =============================================================================

function IconButton({
  onClick,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      type="button"
      style={
        disabled
          ? iconButtonDisabledStyle
          : isHovered
          ? iconButtonHoverStyle
          : iconButtonStyle
      }
      onClick={onClick}
      disabled={disabled}
      title={title}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </button>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Slide thumbnail panel with full slide management
 */
export function SlideThumbnailPanel({
  renderThumbnail,
}: SlideThumbnailPanelProps) {
  const { document, dispatch, activeSlide } = usePresentationEditor();
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    slideId: null,
  });
  const [dragState, setDragState] = useState<{
    draggingId: SlideId | null;
    overId: SlideId | null;
    position: "before" | "after" | null;
  }>({ draggingId: null, overId: null, position: null });

  const handleSlideClick = useCallback(
    (slideId: SlideId) => {
      dispatch({ type: "SELECT_SLIDE", slideId });
    },
    [dispatch]
  );

  const handleAddSlide = useCallback(() => {
    const newSlide: Slide = { shapes: [] };
    dispatch({
      type: "ADD_SLIDE",
      slide: newSlide,
      afterSlideId: activeSlide?.id,
    });
  }, [dispatch, activeSlide]);

  const handleDuplicateSlide = useCallback(
    (slideId: SlideId) => {
      dispatch({ type: "DUPLICATE_SLIDE", slideId });
    },
    [dispatch]
  );

  const handleDeleteSlide = useCallback(
    (slideId: SlideId) => {
      if (document.slides.length > 1) {
        dispatch({ type: "DELETE_SLIDE", slideId });
      }
    },
    [dispatch, document.slides.length]
  );

  const handleMoveSlide = useCallback(
    (slideId: SlideId, direction: "up" | "down") => {
      const currentIndex = document.slides.findIndex((s) => s.id === slideId);
      const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (newIndex >= 0 && newIndex < document.slides.length) {
        dispatch({ type: "MOVE_SLIDE", slideId, toIndex: newIndex });
      }
    },
    [dispatch, document.slides]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, slideId: SlideId) => {
      e.preventDefault();
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        slideId,
      });
    },
    []
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, visible: false }));
  }, []);

  // Drag handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent, slideId: SlideId) => {
      e.dataTransfer.effectAllowed = "move";
      setDragState({ draggingId: slideId, overId: null, position: null });
    },
    []
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, slideId: SlideId, index: number) => {
      e.preventDefault();
      if (dragState.draggingId === slideId) return;

      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const position = e.clientY < midY ? "before" : "after";

      setDragState((prev) => ({
        ...prev,
        overId: slideId,
        position,
      }));
    },
    [dragState.draggingId]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, targetSlideId: SlideId, targetIndex: number) => {
      e.preventDefault();
      if (!dragState.draggingId || dragState.draggingId === targetSlideId) {
        setDragState({ draggingId: null, overId: null, position: null });
        return;
      }

      let newIndex = targetIndex;
      if (dragState.position === "after") {
        newIndex = targetIndex + 1;
      }

      // Adjust if dragging from before the target
      const currentIndex = document.slides.findIndex(
        (s) => s.id === dragState.draggingId
      );
      if (currentIndex < newIndex) {
        newIndex--;
      }

      dispatch({
        type: "MOVE_SLIDE",
        slideId: dragState.draggingId,
        toIndex: newIndex,
      });

      setDragState({ draggingId: null, overId: null, position: null });
    },
    [dragState, dispatch, document.slides]
  );

  const handleDragEnd = useCallback(() => {
    setDragState({ draggingId: null, overId: null, position: null });
  }, []);

  const contextSlideIndex = contextMenu.slideId
    ? document.slides.findIndex((s) => s.id === contextMenu.slideId)
    : -1;

  return (
    <div style={panelStyle} onDragEnd={handleDragEnd}>
      {/* Header with actions */}
      <div style={headerStyle}>
        <span style={headerTitleStyle}>Slides</span>
        <div style={buttonGroupStyle}>
          <IconButton onClick={handleAddSlide} title="Add Slide">
            <PlusIcon />
          </IconButton>
          <IconButton
            onClick={() => activeSlide && handleDuplicateSlide(activeSlide.id)}
            disabled={!activeSlide}
            title="Duplicate Slide"
          >
            <CopyIcon />
          </IconButton>
          <IconButton
            onClick={() => activeSlide && handleDeleteSlide(activeSlide.id)}
            disabled={!activeSlide || document.slides.length <= 1}
            title="Delete Slide"
          >
            <TrashIcon />
          </IconButton>
        </div>
      </div>

      {/* Slide list */}
      <div style={listStyle}>
        {document.slides.map((slideWithId, index) => {
          const isActive = slideWithId.id === activeSlide?.id;
          return (
            <ThumbnailItem
              key={slideWithId.id}
              slideWithId={slideWithId}
              index={index}
              isActive={isActive}
              totalSlides={document.slides.length}
              renderThumbnail={renderThumbnail}
              onClick={() => handleSlideClick(slideWithId.id)}
              onContextMenu={(e) => handleContextMenu(e, slideWithId.id)}
              onDelete={() => handleDeleteSlide(slideWithId.id)}
              onDragStart={(e) => handleDragStart(e, slideWithId.id)}
              onDragOver={(e) => handleDragOver(e, slideWithId.id, index)}
              onDrop={(e) => handleDrop(e, slideWithId.id, index)}
              isDragOver={dragState.overId === slideWithId.id}
              dragPosition={
                dragState.overId === slideWithId.id ? dragState.position : null
              }
            />
          );
        })}
      </div>

      {/* Context menu */}
      <SlideContextMenu
        state={contextMenu}
        onClose={closeContextMenu}
        onDuplicate={() =>
          contextMenu.slideId && handleDuplicateSlide(contextMenu.slideId)
        }
        onDelete={() =>
          contextMenu.slideId && handleDeleteSlide(contextMenu.slideId)
        }
        onMoveUp={() =>
          contextMenu.slideId && handleMoveSlide(contextMenu.slideId, "up")
        }
        onMoveDown={() =>
          contextMenu.slideId && handleMoveSlide(contextMenu.slideId, "down")
        }
        canMoveUp={contextSlideIndex > 0}
        canMoveDown={contextSlideIndex < document.slides.length - 1}
        canDelete={document.slides.length > 1}
      />
    </div>
  );
}

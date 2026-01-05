/**
 * @file Slide list item component
 *
 * Individual slide thumbnail with selection and delete support.
 * Hover state is managed at the list level to ensure at most one
 * item is hovered at any time.
 */

import { memo } from "react";
import type { SlideListItemProps } from "./types";
import { SlideNumberBadge } from "./SlideNumberBadge";
import {
  getItemWrapperStyle,
  getThumbnailContainerStyle,
  thumbnailContentStyle,
  thumbnailFallbackStyle,
  getDeleteButtonStyle,
} from "./styles";

/**
 * Individual slide item in the list
 *
 * Memoized to prevent unnecessary re-renders when hovering other items.
 * Receives stable callbacks and creates its own closures internally.
 */
export const SlideListItem = memo(function SlideListItem({
  slideWithId,
  index,
  aspectRatio,
  orientation,
  mode,
  isSelected,
  isPrimary,
  isActive,
  canDelete,
  isDragging,
  isAnyDragging,
  isHovered,
  renderThumbnail,
  onItemClick,
  onItemContextMenu,
  onItemDelete,
  onItemPointerEnter,
  onItemPointerLeave,
  onItemDragStart,
  onItemDragOver,
  onItemDrop,
  itemRef,
}: SlideListItemProps) {
  const isEditable = mode === "editable";
  const slideId = slideWithId.id;

  // Show delete button when hovered and not dragging
  const showDeleteButton = isEditable && canDelete && isHovered && !isAnyDragging;

  // Create item-specific handlers (closures are fine since component is memoized)
  const handleClick = (e: React.MouseEvent) => {
    onItemClick(slideId, index, e);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    onItemContextMenu(slideId, e);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onItemDelete(slideId);
  };

  const handlePointerEnter = () => {
    onItemPointerEnter(slideId);
  };

  const handlePointerLeave = () => {
    onItemPointerLeave(slideId);
  };

  const handleDragStart = (e: React.DragEvent) => {
    onItemDragStart(e, slideId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    onItemDragOver(e, index);
  };

  const handleDrop = (e: React.DragEvent) => {
    onItemDrop(e, index);
  };

  return (
    <div ref={itemRef} style={getItemWrapperStyle(orientation)}>
      {/* Page number outside slide */}
      <SlideNumberBadge number={index + 1} orientation={orientation} />

      {/* Thumbnail wrapper */}
      <div
        style={{
          position: "relative",
          width: orientation === "vertical" ? "100%" : undefined,
          minWidth: orientation === "horizontal" ? "100px" : undefined,
          maxWidth: orientation === "horizontal" ? "140px" : undefined,
          opacity: isDragging ? 0.4 : 1,
          transition: "opacity 0.1s ease",
        }}
        draggable={isEditable}
        onDragStart={isEditable ? handleDragStart : undefined}
        onDragOver={isEditable ? handleDragOver : undefined}
        onDrop={isEditable ? handleDrop : undefined}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        {/* Thumbnail */}
        <div
          style={getThumbnailContainerStyle(
            aspectRatio,
            isSelected,
            isPrimary,
            isActive
          )}
          onClick={handleClick}
          onContextMenu={isEditable ? handleContextMenu : undefined}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleClick(e as unknown as React.MouseEvent);
            }
          }}
          aria-label={`Slide ${index + 1}`}
          aria-selected={isSelected || isActive}
        >
          <div style={thumbnailContentStyle}>
            {renderThumbnail !== undefined ? (
              renderThumbnail(slideWithId, index)
            ) : (
              <span style={thumbnailFallbackStyle}>
                {slideWithId.slide.shapes.length} shapes
              </span>
            )}
          </div>

          {/* Delete button (inside thumbnail, shown on hover) */}
          {isEditable && canDelete && (
            <button
              type="button"
              style={getDeleteButtonStyle(showDeleteButton)}
              onClick={handleDeleteClick}
              aria-label="Delete slide"
              tabIndex={showDeleteButton ? 0 : -1}
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

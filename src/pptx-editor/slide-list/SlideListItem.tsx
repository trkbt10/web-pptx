/**
 * @file Slide list item component
 *
 * Individual slide thumbnail with selection and delete support.
 * Drag indicator is now in SlideListGap, not here.
 */

import type { SlideListItemProps } from "./types";
import { SlideNumberBadge } from "./SlideNumberBadge";
import { useItemHover } from "./hooks";
import {
  getItemWrapperStyle,
  getThumbnailContainerStyle,
  thumbnailContentStyle,
  thumbnailFallbackStyle,
  getDeleteButtonStyle,
} from "./styles";

/**
 * Individual slide item in the list
 */
export function SlideListItem({
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
  renderThumbnail,
  onClick,
  onContextMenu,
  onDelete,
  onDragStart,
  itemRef,
}: SlideListItemProps) {
  const isEditable = mode === "editable";

  // Hover state with drag awareness (clears when ANY drag starts)
  const {
    isHovered,
    onMouseEnter,
    onMouseLeave,
    onDragStart: handleDragStart,
  } = useItemHover({ isDragging: isAnyDragging });

  // Hide delete button when any drag is active or not hovered
  const showDeleteButton = isEditable && canDelete && isHovered && !isAnyDragging;

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
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
        onDragStart={isEditable ? (e) => handleDragStart(e, onDragStart) : undefined}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {/* Thumbnail */}
        <div
          style={getThumbnailContainerStyle(
            aspectRatio,
            isSelected,
            isPrimary,
            isActive
          )}
          onClick={onClick}
          onContextMenu={isEditable ? onContextMenu : undefined}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onClick(e as unknown as React.MouseEvent);
            }
          }}
          aria-label={`Slide ${index + 1}`}
          aria-selected={isSelected || isActive}
        >
          <div style={thumbnailContentStyle}>
            {renderThumbnail ? (
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
}

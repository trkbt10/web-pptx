/**
 * @file Slide list styles
 *
 * CSS-in-JS style definitions for the slide list component.
 */

import type { CSSProperties } from "react";
import type { SlideListOrientation, SlideListMode } from "./types";
import {
  colorTokens,
  radiusTokens,
  spacingTokens,
  fontTokens,
} from "../ui/design-tokens/index";

// =============================================================================
// Container styles
// =============================================================================

export function getContainerStyle(
  orientation: SlideListOrientation
): CSSProperties {
  return {
    display: "flex",
    flexDirection: orientation === "vertical" ? "column" : "row",
    // No gap here - gaps are handled by SlideListGap component
    padding: orientation === "vertical" ? "8px 8px" : "8px 8px",
    overflow: "auto",
    height: "100%",
  };
}

// =============================================================================
// Item wrapper styles
// =============================================================================

export function getItemWrapperStyle(
  orientation: SlideListOrientation
): CSSProperties {
  return {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: orientation === "vertical" ? "6px" : "3px",
    flexDirection: orientation === "vertical" ? "row" : "column",
    flexShrink: 0,
  };
}

// =============================================================================
// Number badge styles (positioned outside slide)
// =============================================================================

export function getNumberBadgeStyle(
  orientation: SlideListOrientation
): CSSProperties {
  const base: CSSProperties = {
    fontSize: "11px",
    fontWeight: 500,
    fontVariantNumeric: "tabular-nums",
    color: "rgba(0, 0, 0, 0.4)",
    textAlign: "center",
    userSelect: "none",
    flexShrink: 0,
    lineHeight: 1,
  };

  if (orientation === "vertical") {
    return {
      ...base,
      minWidth: "20px",
    };
  }

  // horizontal
  return {
    ...base,
    marginBottom: "2px",
  };
}

// =============================================================================
// Thumbnail styles
// =============================================================================

/**
 * Selection ring color based on state.
 * Uses box-shadow inset to avoid layout shift.
 */
function getSelectionRing(
  isSelected: boolean,
  isPrimary: boolean,
  isActive: boolean
): string {
  if (isSelected) {
    const color = isPrimary
      ? colorTokens.selection.primary
      : colorTokens.selection.secondary;
    return `inset 0 0 0 2px ${color}`;
  }
  if (isActive) {
    return `inset 0 0 0 2px ${colorTokens.accent.primary}`;
  }
  return "none";
}

export function getThumbnailContainerStyle(
  aspectRatio: string,
  isSelected: boolean,
  isPrimary: boolean,
  isActive: boolean
): CSSProperties {
  const selectionRing = getSelectionRing(isSelected, isPrimary, isActive);
  const baseShadow = "0 1px 2px rgba(0, 0, 0, 0.08)";

  return {
    width: "100%",
    height: "auto",
    aspectRatio,
    backgroundColor: "#fff",
    borderRadius: "3px",
    boxShadow: selectionRing !== "none"
      ? `${selectionRing}, ${baseShadow}`
      : baseShadow,
    transition: "box-shadow 0.12s ease",
    position: "relative",
    overflow: "hidden",
    cursor: "pointer",
  };
}

export const thumbnailContentStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

/** Style for children of thumbnailContent to fill the container */
export const thumbnailFillStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

export const thumbnailFallbackStyle: CSSProperties = {
  color: "rgba(0, 0, 0, 0.3)",
  fontSize: "10px",
};

// =============================================================================
// Delete button styles (circular)
// =============================================================================

export function getDeleteButtonStyle(visible: boolean): CSSProperties {
  return {
    position: "absolute",
    top: "4px",
    right: "4px",
    width: "18px",
    height: "18px",
    borderRadius: "3px",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    opacity: visible ? 1 : 0,
    transition: "opacity 0.15s ease",
    zIndex: 10,
  };
}

// =============================================================================
// Gap styles (for add button and drop indicator)
// =============================================================================

/** Gap height/width for spacing between slides */
const GAP_SIZE = 6;
const GAP_SIZE_DRAG = 8;

export function getGapStyle(
  orientation: SlideListOrientation,
  isDragTarget: boolean = false
): CSSProperties {
  const size = isDragTarget ? GAP_SIZE_DRAG : GAP_SIZE;

  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: orientation === "vertical" ? `${size}px` : undefined,
    width: orientation === "horizontal" ? `${size}px` : undefined,
    position: "relative",
    flexShrink: 0,
    // Must be above slides so the + button (which overflows) is clickable
    zIndex: 1,
  };
}

export function getGapDropIndicatorStyle(
  orientation: SlideListOrientation
): CSSProperties {
  if (orientation === "vertical") {
    return {
      position: "absolute",
      left: "26px", // align with slide (past number badge)
      right: 0,
      height: "2px",
      top: "50%",
      transform: "translateY(-50%)",
      backgroundColor: colorTokens.selection.primary,
      borderRadius: "1px",
    };
  }

  // horizontal
  return {
    position: "absolute",
    top: "16px", // below number
    bottom: 0,
    width: "2px",
    left: "50%",
    transform: "translateX(-50%)",
    backgroundColor: colorTokens.selection.primary,
    borderRadius: "1px",
  };
}

export function getAddButtonStyle(visible: boolean): CSSProperties {
  return {
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    backgroundColor: visible ? "rgba(0, 0, 0, 0.08)" : "transparent",
    color: "rgba(0, 0, 0, 0.5)",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    lineHeight: 1,
    opacity: visible ? 1 : 0,
    pointerEvents: visible ? "auto" : "none",
    transition: "opacity 0.15s ease, background-color 0.1s ease",
    position: "absolute",
  };
}

// =============================================================================
// Hover styles for item
// =============================================================================

export const itemHoverOverlayStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundColor: "rgba(0, 0, 0, 0.02)",
  pointerEvents: "none",
  opacity: 0,
  transition: "opacity 0.15s ease",
};

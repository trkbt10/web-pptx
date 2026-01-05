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
    gap: orientation === "vertical" ? "12px" : "16px",
    padding: orientation === "vertical" ? "16px 12px" : "12px 16px",
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
    gap: orientation === "vertical" ? "8px" : "4px",
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
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

export const thumbnailFallbackStyle: CSSProperties = {
  color: "#999",
  fontSize: "11px",
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
// Gap styles (for add button)
// =============================================================================

export function getGapStyle(orientation: SlideListOrientation): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: orientation === "vertical" ? "12px" : undefined,
    minWidth: orientation === "horizontal" ? "12px" : undefined,
    position: "relative",
    flexShrink: 0,
  };
}

export function getAddButtonStyle(visible: boolean): CSSProperties {
  return {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    backgroundColor: visible
      ? colorTokens.background.hover
      : "transparent",
    color: colorTokens.text.primary,
    border: `1px solid ${visible ? colorTokens.border.strong : "transparent"}`,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    fontWeight: fontTokens.weight.normal,
    opacity: visible ? 1 : 0,
    transition: "opacity 0.2s ease, background-color 0.15s ease",
    position: "absolute",
  };
}

// =============================================================================
// Drag indicator styles
// =============================================================================

export function getDragIndicatorStyle(
  position: "before" | "after",
  orientation: SlideListOrientation
): CSSProperties {
  const base: CSSProperties = {
    position: "absolute",
    backgroundColor: colorTokens.selection.primary,
    zIndex: 10,
  };

  if (orientation === "vertical") {
    return {
      ...base,
      left: 0,
      right: 0,
      height: "2px",
      ...(position === "before" ? { top: -4 } : { bottom: -4 }),
    };
  }

  // horizontal
  return {
    ...base,
    top: 0,
    bottom: 0,
    width: "2px",
    ...(position === "before" ? { left: -4 } : { right: -4 }),
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

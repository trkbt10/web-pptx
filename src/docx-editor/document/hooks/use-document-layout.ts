/**
 * @file Document Layout Hook
 *
 * React hook for computing and caching document layout.
 * Handles paragraph layout and page flow for DOCX documents.
 */

import { useMemo } from "react";
import type { DocxParagraph } from "../../../docx/domain/paragraph";
import type { Pixels } from "../../../ooxml/domain/units";
import { px } from "../../../ooxml/domain/units";
import type {
  LayoutParagraphResult,
  LayoutParagraphInput,
  PagedLayoutResult,
  PageFlowConfig,
} from "../../../office-text-layout";
import {
  layoutDocument,
  paragraphsToLayoutInputs,
  flowIntoPages,
  createSinglePageLayout,
  DEFAULT_PAGE_FLOW_CONFIG,
} from "../../../office-text-layout";

// =============================================================================
// Types
// =============================================================================

export type DocumentLayoutMode = "paged" | "continuous";

export type UseDocumentLayoutOptions = {
  /** Paragraphs to layout */
  readonly paragraphs: readonly DocxParagraph[];
  /** Content width in pixels (without margins) */
  readonly contentWidth: Pixels;
  /** Layout mode */
  readonly mode?: DocumentLayoutMode;
  /** Page configuration (for paged mode) */
  readonly pageConfig?: PageFlowConfig;
};

export type DocumentLayoutResult = {
  /** Paged layout result */
  readonly pagedLayout: PagedLayoutResult;
  /** Flat layout result (all paragraphs) */
  readonly paragraphs: readonly LayoutParagraphResult[];
  /** Total document height */
  readonly totalHeight: Pixels;
  /** Layout inputs (for cursor/selection calculations) */
  readonly layoutInputs: readonly LayoutParagraphInput[];
};

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for computing document layout.
 */
export function useDocumentLayout({
  paragraphs,
  contentWidth,
  mode = "paged",
  pageConfig = DEFAULT_PAGE_FLOW_CONFIG,
}: UseDocumentLayoutOptions): DocumentLayoutResult {
  // Convert DOCX paragraphs to layout inputs
  const layoutInputs = useMemo(() => {
    return paragraphsToLayoutInputs(paragraphs);
  }, [paragraphs]);

  // Compute paragraph layouts
  const { paragraphs: layoutedParagraphs, totalHeight } = useMemo(() => {
    return layoutDocument(layoutInputs, contentWidth);
  }, [layoutInputs, contentWidth]);

  // Compute paged layout
  const pagedLayout = useMemo(() => {
    if (mode === "continuous") {
      // Single page mode - no pagination
      return createSinglePageLayout(layoutedParagraphs, contentWidth, totalHeight);
    }

    // Paged mode - split into pages
    return flowIntoPages({
      paragraphs: layoutedParagraphs,
      config: pageConfig,
    });
  }, [layoutedParagraphs, mode, pageConfig, contentWidth, totalHeight]);

  return {
    pagedLayout,
    paragraphs: layoutedParagraphs,
    totalHeight,
    layoutInputs,
  };
}

// =============================================================================
// Memoization Helpers
// =============================================================================

/**
 * Create a stable key for paragraph array for caching.
 */
export function createParagraphKey(paragraphs: readonly DocxParagraph[]): string {
  // Simple implementation - could be enhanced with content hashing
  return paragraphs.length.toString();
}

/**
 * Check if paragraphs have changed significantly.
 */
export function haveParagraphsChanged(
  prev: readonly DocxParagraph[],
  next: readonly DocxParagraph[],
): boolean {
  if (prev.length !== next.length) {
    return true;
  }

  // Compare by reference (shallow)
  for (let i = 0; i < prev.length; i++) {
    if (prev[i] !== next[i]) {
      return true;
    }
  }

  return false;
}

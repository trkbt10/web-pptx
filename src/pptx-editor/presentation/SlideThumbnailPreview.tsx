/**
 * @file Slide thumbnail preview component
 *
 * Renders scaled SVG preview for a slide thumbnail.
 * Extracts inner content from full SVG document and displays with proper scaling.
 */

import { useMemo, type CSSProperties } from "react";

// =============================================================================
// Types
// =============================================================================

export type SlideThumbnailPreviewProps = {
  readonly svg: string;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  overflow: "hidden",
  backgroundColor: "#fff",
};

const svgStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "block",
};

// =============================================================================
// Component
// =============================================================================

/**
 * Slide thumbnail preview component
 *
 * Renders an SVG string as a scaled preview within its container.
 */
export function SlideThumbnailPreview({ svg }: SlideThumbnailPreviewProps) {
  // Extract inner content from full SVG document
  const innerContent = useMemo(() => {
    const match = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
    return match?.[1] ?? "";
  }, [svg]);

  // Extract viewBox from the SVG
  const viewBox = useMemo(() => {
    const match = svg.match(/viewBox="([^"]*)"/);
    return match?.[1] ?? "0 0 960 540";
  }, [svg]);

  return (
    <div style={containerStyle}>
      <svg
        style={svgStyle}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        dangerouslySetInnerHTML={{ __html: innerContent }}
      />
    </div>
  );
}

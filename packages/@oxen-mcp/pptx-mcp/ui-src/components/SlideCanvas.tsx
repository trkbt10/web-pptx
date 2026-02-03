/**
 * @file Slide canvas component for rendering slides
 */

import type { ReactElement } from "react";
import { tokens } from "@oxen-ui/ui-components";

type SlideData = {
  readonly number: number;
  readonly svg?: string;
};

type SlideCanvasProps = {
  readonly slide?: SlideData;
  readonly width: number;
  readonly height: number;
};

function renderSlideContent(slide: SlideData): ReactElement {
  const { color } = tokens;

  if (slide.svg) {
    return (
      <div
        style={{ width: "100%", height: "100%" }}
        // biome-ignore lint: SVG content is from trusted source
        dangerouslySetInnerHTML={{ __html: slide.svg }}
      />
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: color.text.inverse,
        fontSize: "24px",
      }}
    >
      <span>Slide {slide.number}</span>
    </div>
  );
}

/** Slide canvas for displaying the current slide */
export function SlideCanvas({ slide, width, height }: SlideCanvasProps): ReactElement {
  const aspectRatio = width / height;
  const { color, spacing, radius, font } = tokens;

  const baseStyle: React.CSSProperties = {
    background: "#fff",
    width: "100%",
    maxWidth: "800px",
    borderRadius: radius.sm,
    boxShadow: "0 4px 24px rgba(0, 0, 0, 0.3)",
    aspectRatio,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  };

  if (!slide) {
    return (
      <div style={{ ...baseStyle, color: color.text.tertiary }}>
        <div style={{ textAlign: "center", padding: spacing.xl }}>
          <p style={{ marginBottom: spacing.sm }}>No presentation loaded</p>
          <p>
            Use{" "}
            <code
              style={{
                background: color.background.hover,
                padding: `${spacing.xs} ${spacing.sm}`,
                borderRadius: radius.sm,
                fontSize: font.size.md,
              }}
            >
              pptx_create_presentation
            </code>{" "}
            to start
          </p>
        </div>
      </div>
    );
  }

  return <div style={baseStyle}>{renderSlideContent(slide)}</div>;
}

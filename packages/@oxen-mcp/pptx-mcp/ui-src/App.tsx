/**
 * @file Main PPTX preview application component
 */

import { useState, useEffect, type ReactElement } from "react";
import { tokens, injectCSSVariables } from "@oxen-ui/ui-components";
import { bridge, type ToolResult } from "./mcp-bridge";
import { SlideCanvas } from "./components/SlideCanvas";
import { Thumbnails } from "./components/Thumbnails";
import { BuildProgress } from "./components/BuildProgress";

type SlideData = {
  readonly number: number;
  readonly svg?: string;
};

type PresentationData = {
  readonly slideCount: number;
  readonly width: number;
  readonly height: number;
};

// Inject CSS variables on load
injectCSSVariables();

function formatPresentationStatus(presentation: PresentationData | null): string {
  if (!presentation) {
    return "No presentation";
  }
  const slideLabel = presentation.slideCount !== 1 ? "slides" : "slide";
  return `${presentation.slideCount} ${slideLabel} | ${presentation.width}x${presentation.height}`;
}

/** Main PPTX preview application */
export function App(): ReactElement {
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [presentation, setPresentation] = useState<PresentationData | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = bridge.onToolResult((result: ToolResult) => {
      const meta = result._meta;
      if (!meta) {
        return;
      }

      // Update presentation info
      if (meta.presentation) {
        setPresentation(meta.presentation);

        // Initialize slides array if needed
        const slideCount = meta.presentation.slideCount;
        setSlides((prev) => {
          if (prev.length < slideCount) {
            const newSlides = [...prev];
            for (let i = prev.length; i < slideCount; i++) {
              newSlides.push({ number: i + 1 });
            }
            return newSlides;
          }
          return prev;
        });
      }

      // Update current slide
      if (meta.currentSlide !== undefined) {
        setCurrentSlide(meta.currentSlide - 1);
      }

      // Update slide data
      if (meta.slideData) {
        setSlides((prev) => {
          const updated = [...prev];
          const idx = meta.slideData!.number - 1;
          if (idx >= 0 && idx < updated.length) {
            updated[idx] = meta.slideData!;
          }
          return updated;
        });
      }

      // Update last action
      if (result.content?.[0]?.text) {
        try {
          const data = JSON.parse(result.content[0].text);
          setLastAction(data.message || null);
        } catch (parseError) {
          // Content may not be JSON, this is expected for non-JSON responses
          console.debug("Tool result content is not JSON:", parseError);
        }
      }

      setIsBuilding(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleSlideSelect = (index: number): void => {
    setCurrentSlide(index);
    bridge.notifyInteraction("slideSelect", { slideNumber: index + 1 });
  };

  const { color, spacing, font, radius } = tokens;

  return (
    <div
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        background: color.background.primary,
        color: color.text.primary,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          padding: `${spacing.md} ${spacing.lg}`,
          background: color.background.secondary,
          borderBottom: `1px solid ${color.border.strong}`,
          display: "flex",
          alignItems: "center",
          gap: spacing.md,
        }}
      >
        <h1 style={{ fontSize: font.size.lg, fontWeight: font.weight.medium, margin: 0 }}>
          PPTX Preview
        </h1>
        <div style={{ fontSize: font.size.md, color: color.text.secondary, marginLeft: "auto" }}>
          {formatPresentationStatus(presentation)}
        </div>
      </header>

      <main style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <Thumbnails
          slides={slides}
          currentIndex={currentSlide}
          onSelect={handleSlideSelect}
          width={presentation?.width}
          height={presentation?.height}
        />

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: spacing.xl,
            position: "relative",
          }}
        >
          <SlideCanvas
            slide={slides[currentSlide]}
            width={presentation?.width ?? 960}
            height={presentation?.height ?? 540}
          />

          {isBuilding && <BuildProgress message="Building..." />}
          {lastAction && !isBuilding && (
            <div
              style={{
                position: "absolute",
                bottom: spacing.lg,
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(0, 0, 0, 0.8)",
                padding: `${spacing.sm} ${spacing.lg}`,
                borderRadius: radius.sm,
                fontSize: font.size.md,
                color: "#0f0",
              }}
            >
              {lastAction}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/**
 * @file Demo font catalog wiring for pages app
 */

import type { FontCatalog } from "@lib/pptx-editor";
import { createGoogleFontsCatalog } from "./google-fonts-catalog";

/**
 * Creates the Google Fonts-backed catalog used by the demo pages.
 */
export function createPagesFontCatalog(): FontCatalog {
  function resolveFamiliesUrl(): string {
    if (typeof window === "undefined") {
      throw new Error("createPagesFontCatalog: window is required to resolve the families URL");
    }

    // Resolve relative to the current location so this works for both:
    // - GitHub Pages (https://.../web-pptx/#/...)
    // - local dev (http://localhost:5174/web-pptx/#/...)
    return new URL("fonts/google-fonts-families.json", window.location.href).toString();
  }

  const catalog = createGoogleFontsCatalog({
    familiesUrl: resolveFamiliesUrl(),
    cssBaseUrl: "https://fonts.googleapis.com/css2",
    display: "swap",
    weights: [400, 500, 600, 700],
    cacheKey: "web-pptx:google-fonts-families:v1",
    cacheTtlMs: 1000 * 60 * 60 * 24 * 7, // 7 days
    timeoutMs: 10_000,
  });

  return {
    label: catalog.label,
    async listFamilies() {
      try {
        return await Promise.resolve(catalog.listFamilies());
      } catch (error) {
        console.warn("createPagesFontCatalog: failed to load Google Fonts families", error);
        throw error;
      }
    },
    async ensureFamilyLoaded(family: string) {
      return await catalog.ensureFamilyLoaded(family);
    },
  };
}

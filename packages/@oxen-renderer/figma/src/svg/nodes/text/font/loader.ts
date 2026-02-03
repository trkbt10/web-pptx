/**
 * @file Font loader interface for DI pattern
 *
 * Provides an abstraction for loading font files in different environments.
 * Node.js can load from filesystem, browsers can use fetch or IndexedDB.
 */

import type { Font } from "opentype.js";

/**
 * Font loading result
 */
export type LoadedFont = {
  /** The loaded opentype.js Font object */
  readonly font: Font;
  /** Font family name */
  readonly family: string;
  /** Font weight (100-900) */
  readonly weight: number;
  /** Font style */
  readonly style: "normal" | "italic" | "oblique";
  /** PostScript name */
  readonly postscriptName?: string;
};

/**
 * Font loading options
 */
export type FontLoadOptions = {
  /** Font family to load */
  readonly family: string;
  /** Desired weight (will find closest match) */
  readonly weight?: number;
  /** Desired style */
  readonly style?: "normal" | "italic" | "oblique";
};

/**
 * Font loader interface
 *
 * Implement this interface to provide font loading in your environment.
 * - Node.js: Load from filesystem (system fonts or bundled fonts)
 * - Browser: Load from fetch, IndexedDB, or bundled fonts
 */
export interface FontLoader {
  /**
   * Load a font matching the given options
   *
   * @param options - Font loading options
   * @returns Loaded font or undefined if not found
   */
  loadFont(options: FontLoadOptions): Promise<LoadedFont | undefined>;

  /**
   * Check if a font is available
   *
   * @param family - Font family name
   * @returns True if the font family is available
   */
  isFontAvailable(family: string): Promise<boolean>;

  /**
   * List available font families
   *
   * @returns Array of available font family names
   */
  listFontFamilies?(): Promise<readonly string[]>;
}

/**
 * Font cache for loaded fonts
 */
export class FontCache {
  private cache = new Map<string, LoadedFont>();

  /**
   * Generate cache key from font options
   */
  private getCacheKey(options: FontLoadOptions): string {
    return `${options.family}:${options.weight ?? 400}:${options.style ?? "normal"}`;
  }

  /**
   * Get cached font
   */
  get(options: FontLoadOptions): LoadedFont | undefined {
    return this.cache.get(this.getCacheKey(options));
  }

  /**
   * Set cached font
   */
  set(options: FontLoadOptions, font: LoadedFont): void {
    this.cache.set(this.getCacheKey(options), font);
  }

  /**
   * Check if font is cached
   */
  has(options: FontLoadOptions): boolean {
    return this.cache.has(this.getCacheKey(options));
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size;
  }
}

/**
 * Caching wrapper for font loaders
 */
export class CachingFontLoader implements FontLoader {
  private cache = new FontCache();

  constructor(private readonly innerLoader: FontLoader) {}

  async loadFont(options: FontLoadOptions): Promise<LoadedFont | undefined> {
    const cached = this.cache.get(options);
    if (cached) {
      return cached;
    }

    const font = await this.innerLoader.loadFont(options);
    if (font) {
      this.cache.set(options, font);
    }

    return font;
  }

  async isFontAvailable(family: string): Promise<boolean> {
    return this.innerLoader.isFontAvailable(family);
  }

  async listFontFamilies(): Promise<readonly string[]> {
    if (this.innerLoader.listFontFamilies) {
      return this.innerLoader.listFontFamilies();
    }
    return [];
  }

  /**
   * Clear the font cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

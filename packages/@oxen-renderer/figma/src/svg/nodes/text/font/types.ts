/**
 * @file Font resolution type definitions
 */

/**
 * Figma font reference (from .fig file)
 */
export type FigmaFontRef = {
  readonly family: string;
  readonly style: string;
  readonly postscript?: string;
};

/**
 * Resolved font information
 */
export type ResolvedFont = {
  /** CSS font-family value (with fallbacks) */
  readonly fontFamily: string;
  /** Numeric font weight (100-900) */
  readonly fontWeight: number;
  /** Font style (normal, italic, oblique) */
  readonly fontStyle: "normal" | "italic" | "oblique";
  /** Whether the exact font was found */
  readonly isExactMatch: boolean;
  /** Original Figma font reference */
  readonly source: FigmaFontRef;
  /** Fallback chain used */
  readonly fallbackChain: readonly string[];
};

/**
 * Font availability status
 */
export type FontAvailability = {
  readonly available: boolean;
  readonly family: string;
  readonly variants: readonly FontVariant[];
};

/**
 * Font variant (weight + style combination)
 */
export type FontVariant = {
  readonly weight: number;
  readonly style: "normal" | "italic" | "oblique";
  readonly postscript?: string;
};

/**
 * Font resolver configuration
 */
export type FontResolverConfig = {
  /** Custom font mappings (Figma family -> CSS font stack) */
  readonly fontMappings?: ReadonlyMap<string, readonly string[]>;
  /** Default fallback fonts */
  readonly defaultFallbacks?: readonly string[];
  /** Font availability checker */
  readonly availabilityChecker?: FontAvailabilityChecker;
};

/**
 * Font availability checker interface
 */
export type FontAvailabilityChecker = {
  /**
   * Check if a font family is available
   */
  isAvailable(family: string): boolean | Promise<boolean>;

  /**
   * Get available variants for a font family
   */
  getVariants?(family: string): readonly FontVariant[] | Promise<readonly FontVariant[]>;
};

/**
 * Font metrics (for text measurement)
 */
export type FontMetrics = {
  /** Units per em */
  readonly unitsPerEm: number;
  /** Ascender (positive, above baseline) */
  readonly ascender: number;
  /** Descender (negative, below baseline) */
  readonly descender: number;
  /** Line gap */
  readonly lineGap: number;
  /** Cap height (height of capital letters) */
  readonly capHeight?: number;
  /** X-height (height of lowercase x) */
  readonly xHeight?: number;
};

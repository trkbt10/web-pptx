/**
 * @file Font resolution module
 *
 * Provides font resolution from Figma font references to CSS font stacks.
 *
 * Features:
 * - Font weight detection from style strings
 * - Font style (italic/oblique) detection
 * - Font family mapping with fallbacks
 * - Async font availability checking
 */

// Types
export type {
  FigmaFontRef,
  ResolvedFont,
  FontAvailability,
  FontVariant,
  FontResolverConfig,
  FontAvailabilityChecker,
  FontMetrics,
} from "./types";

// Weight detection
export {
  FONT_WEIGHTS,
  type FontWeight,
  detectWeight,
  normalizeWeight,
  getWeightName,
} from "./weight";

// Style detection
export { type FontStyle, detectStyle, isItalic, isOblique, isSlanted } from "./style";

// Font mappings
export {
  SYSTEM_UI_STACK,
  MONOSPACE_STACK,
  SERIF_STACK,
  SANS_SERIF_STACK,
  COMMON_FONT_MAPPINGS,
  GENERIC_FALLBACKS,
  detectFontCategory,
  getDefaultFallbacks,
} from "./mappings";

// Resolver
export {
  FontResolver,
  createFontResolver,
  createBrowserAvailabilityChecker,
} from "./resolver";

// Font Loader (DI interface)
export type {
  FontLoader,
  FontLoadOptions,
  LoadedFont,
} from "./loader";
export { FontCache, CachingFontLoader } from "./loader";

// Node.js Font Loader
export {
  NodeFontLoader,
  createNodeFontLoader,
  createNodeFontLoaderWithFontsource,
} from "./node-loader";

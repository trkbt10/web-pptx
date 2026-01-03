/**
 * @file Design tokens module
 *
 * Centralized design system for pptx-editor UI components.
 */

export {
  tokens,
  colorTokens,
  radiusTokens,
  spacingTokens,
  fontTokens,
  iconTokens,
  type Tokens,
  type ColorTokens,
  type RadiusTokens,
  type SpacingTokens,
  type FontTokens,
  type IconTokens,
} from "./tokens";

export {
  injectCSSVariables,
  removeCSSVariables,
  generateCSSVariables,
  cssVar,
  CSS_VAR_MAP,
} from "./inject";

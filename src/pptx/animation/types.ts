/**
 * @file Animation playback type definitions
 *
 * Types for runtime animation playback of PPTX timing data.
 *
 * @see ECMA-376 Part 1, Section 19.5 (Animation)
 */

/**
 * Animation target - element to animate
 */
export type AnimationTarget = {
  /** OOXML shape ID */
  readonly shapeId: string;
  /** Optional paragraph index for text animations */
  readonly paragraphIndex?: number;
  /** Optional text range */
  readonly textRange?: {
    readonly start: number;
    readonly end: number;
  };
};

/**
 * Effect type enumeration - MS-OE376 Part 4 Section 4.6.3 compliant
 *
 * Only includes filters defined in the official specification.
 *
 * @see MS-OE376 Part 4 Section 4.6.3
 */
export type EffectType =
  | "fade"        // Fade transition (no subtype)
  | "slide"       // Slide from direction: fromTop, fromBottom, fromLeft, fromRight
  | "wipe"        // Wipe from direction: right, left, up, down
  | "blinds"      // Horizontal/vertical blinds
  | "box"         // Box in/out
  | "checkerboard"// Checkerboard across/down
  | "circle"      // Circle in/out
  | "diamond"     // Diamond in/out
  | "dissolve"    // Dissolve effect (no subtype)
  | "strips"      // Diagonal strips: downLeft, upLeft, downRight, upRight
  | "wheel"       // Wheel with spokes: 1, 2, 3, 4, 8
  | "plus"        // Plus/cross shape in/out
  | "barn"        // Barn door: inVertical, inHorizontal, outVertical, outHorizontal
  | "randombar"   // Random bars: horizontal, vertical
  | "wedge";      // Wedge shape (no subtype)

/**
 * Direction/subtype for effects
 *
 * @see MS-OE376 Part 4 Section 4.6.3
 */
export type EffectDirection =
  | "in" | "out"                                    // box, circle, diamond, plus
  | "left" | "right" | "up" | "down"                // wipe, slide
  | "horizontal" | "vertical"                       // blinds, randombar
  | "across" | "downward"                           // checkerboard (across=horizontal, down=vertical)
  | "downLeft" | "upLeft" | "downRight" | "upRight" // strips
  | "inVertical" | "inHorizontal" | "outVertical" | "outHorizontal"; // barn

/**
 * Animation effect configuration
 */
export type EffectConfig = {
  /** Effect type */
  readonly type: EffectType;
  /** Duration in milliseconds */
  readonly duration: number;
  /** Direction (for directional effects) */
  readonly direction?: EffectDirection;
  /** Whether this is an entrance (true) or exit (false) effect */
  readonly entrance?: boolean;
  /** Easing function */
  readonly easing?: "linear" | "ease" | "ease-in" | "ease-out" | "ease-in-out";
  /** Delay before effect starts */
  readonly delay?: number;
};

/**
 * Keyframe value for property animation
 */
export type KeyframeValue = {
  /** Time percentage (0-100) */
  readonly time: number;
  /** Property value at this time */
  readonly value: string | number;
  /** Optional formula */
  readonly formula?: string;
};

/**
 * Property animation configuration
 */
export type PropertyAnimation = {
  /** Property name (e.g., "style.opacity", "ppt_x") */
  readonly property: string;
  /** From value */
  readonly from?: string | number;
  /** To value */
  readonly to?: string | number;
  /** By value (relative) */
  readonly by?: string | number;
  /** Keyframe values */
  readonly keyframes?: readonly KeyframeValue[];
  /** Duration in milliseconds */
  readonly duration: number;
  /** Calculation mode */
  readonly calcMode?: "discrete" | "linear" | "formula";
};

/**
 * DOM element finder function type
 */
export type ElementFinder = (shapeId: string) => HTMLElement | SVGElement | null;

/**
 * Animation player options
 */
export type PlayerOptions = {
  /** Function to find DOM elements by shape ID */
  readonly findElement: ElementFinder;
  /** Callback when animation starts */
  readonly onStart?: () => void;
  /** Callback when animation completes */
  readonly onComplete?: () => void;
  /** Callback for logging/debugging */
  readonly onLog?: (message: string) => void;
  /** Speed multiplier (1.0 = normal) */
  readonly speed?: number;
};

/**
 * Animation player state
 */
export type PlayerState = "idle" | "playing" | "paused" | "stopping" | "stopped";

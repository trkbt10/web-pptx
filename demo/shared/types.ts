export type FileInfo = {
  id: string;
  name: string;
  dir: string;
  path: string;
};

export type PresentationInfo = {
  id: string;
  name: string;
  slideCount: number;
  size: { width: number; height: number };
  appVersion: number | null;
  parseTimeMs: number;
  thumbnail?: string;
};

export type SlideInfo = {
  number: number;
  filename: string;
  hasAnimations: boolean;
  animationCount?: number;
};

export type SlideRenderResult = {
  content: string;
  renderMode: "svg" | "html";
  size: { width: number; height: number };
};

export type TimingData = {
  rootTimeNode: unknown;
  animatedShapeIds: string[];
  animationCount: number;
  animationTypes: Record<string, number>;
};

// =============================================================================
// Slideshow Types
// =============================================================================

/**
 * Animation trigger type
 * - click: Requires user click to trigger
 * - withPrevious: Plays simultaneously with the previous animation
 * - afterPrevious: Plays after the previous animation completes
 */
export type AnimationTriggerType = "click" | "withPrevious" | "afterPrevious";

/**
 * Animation step - represents a click-to-advance point in the slideshow
 * Each step contains animations that play together on a single click
 */
export type AnimationStep = {
  stepIndex: number;
  animations: unknown[]; // TimeNode array serialized
  targetShapeIds: string[];
  triggerType: AnimationTriggerType;
  autoAdvanceDelay?: number; // milliseconds, for afterPrevious
};

/**
 * Slide transition type
 */
export type TransitionType =
  | "blinds"
  | "checker"
  | "circle"
  | "comb"
  | "cover"
  | "cut"
  | "diamond"
  | "dissolve"
  | "fade"
  | "newsflash"
  | "plus"
  | "pull"
  | "push"
  | "random"
  | "randomBar"
  | "split"
  | "strips"
  | "wedge"
  | "wheel"
  | "wipe"
  | "zoom"
  | "none";

/**
 * Slide transition configuration
 */
export type SlideTransitionConfig = {
  type: TransitionType;
  duration: number; // milliseconds
  advanceOnClick?: boolean;
  advanceAfter?: number; // milliseconds
};

/**
 * Complete slideshow data for a single slide
 */
export type SlideshowData = {
  slideNumber: number;
  totalSlides: number;
  htmlContent: string;
  size: { width: number; height: number };
  steps: AnimationStep[];
  transition?: SlideTransitionConfig;
  initiallyHiddenShapes: string[];
  notes?: string;
};

/**
 * Slideshow state for store
 */
export type SlideshowState = {
  fileId: string;
  currentSlide: number;
  totalSlides: number;
  currentStepIndex: number; // -1 = initial state (all hidden), 0+ = step index
  totalSteps: number;
  isPlaying: boolean;
  elapsedTime: number; // seconds
  isBlackScreen: boolean;
  isWhiteScreen: boolean;
};

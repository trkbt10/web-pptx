/**
 * @file Slideshow State Management
 *
 * Zustand store for managing slideshow presentation state.
 * Handles slide navigation, animation steps, and timing.
 */

import { create } from "zustand";
import type { AnimationStep, SlideTransitionConfig } from "@shared/types";

export type SlideshowStore = {
  // Presentation info
  fileId: string;
  currentSlide: number;
  totalSlides: number;
  slideSize: { width: number; height: number };

  // Animation state
  steps: AnimationStep[];
  currentStepIndex: number; // -1 = initial state, 0+ = step executed
  initiallyHiddenShapes: string[];

  // Transition
  transition?: SlideTransitionConfig;
  isTransitioning: boolean;

  // Timer
  elapsedTime: number;
  isTimerRunning: boolean;

  // Screen overlays
  isBlackScreen: boolean;
  isWhiteScreen: boolean;

  // Presenter mode
  presenterWindowRef: Window | null;
  notes: string | undefined;

  // Actions
  setPresentation: (fileId: string, totalSlides: number, slideSize: { width: number; height: number }) => void;
  setSlideData: (data: {
    slideNumber: number;
    steps: AnimationStep[];
    initiallyHiddenShapes: string[];
    transition?: SlideTransitionConfig;
    notes?: string;
  }) => void;

  // Navigation
  goToSlide: (slideNumber: number) => void;
  nextStep: () => { action: "step" | "nextSlide" | "end"; stepIndex?: number };
  prevStep: () => { action: "step" | "prevSlide" | "start"; stepIndex?: number };

  // Screen controls
  toggleBlackScreen: () => void;
  toggleWhiteScreen: () => void;

  // Timer
  startTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
  tickTimer: () => void;

  // Transition
  setTransitioning: (isTransitioning: boolean) => void;

  // Presenter
  setPresenterWindow: (win: Window | null) => void;
  syncToPresenter: () => void;

  // Reset
  reset: () => void;
};

const initialState = {
  fileId: "",
  currentSlide: 1,
  totalSlides: 0,
  slideSize: { width: 960, height: 540 },
  steps: [],
  currentStepIndex: -1,
  initiallyHiddenShapes: [],
  transition: undefined,
  isTransitioning: false,
  elapsedTime: 0,
  isTimerRunning: false,
  isBlackScreen: false,
  isWhiteScreen: false,
  presenterWindowRef: null,
  notes: undefined,
};

export const useSlideshowStore = create<SlideshowStore>((set, get) => ({
  ...initialState,

  setPresentation: (fileId, totalSlides, slideSize) => {
    set({
      fileId,
      totalSlides,
      slideSize,
      currentSlide: 1,
      currentStepIndex: -1,
      elapsedTime: 0,
    });
  },

  setSlideData: (data) => {
    set({
      currentSlide: data.slideNumber,
      steps: data.steps,
      initiallyHiddenShapes: data.initiallyHiddenShapes,
      transition: data.transition,
      notes: data.notes,
      currentStepIndex: -1, // Reset to initial state for new slide
    });
    // Sync to presenter window
    get().syncToPresenter();
  },

  goToSlide: (slideNumber) => {
    const { totalSlides } = get();
    if (slideNumber < 1 || slideNumber > totalSlides) return;
    set({
      currentSlide: slideNumber,
      currentStepIndex: -1,
      isTransitioning: true,
    });
  },

  nextStep: () => {
    const { currentStepIndex, steps, currentSlide, totalSlides } = get();
    const nextIndex = currentStepIndex + 1;

    if (nextIndex < steps.length) {
      // Execute next animation step
      set({ currentStepIndex: nextIndex });
      get().syncToPresenter();
      return { action: "step" as const, stepIndex: nextIndex };
    } else if (currentSlide < totalSlides) {
      // Go to next slide
      set({
        currentSlide: currentSlide + 1,
        currentStepIndex: -1,
        isTransitioning: true,
      });
      get().syncToPresenter();
      return { action: "nextSlide" as const };
    } else {
      // End of presentation
      return { action: "end" as const };
    }
  },

  prevStep: () => {
    const { currentStepIndex, currentSlide } = get();

    if (currentStepIndex > -1) {
      // Go back one step
      const prevIndex = currentStepIndex - 1;
      set({ currentStepIndex: prevIndex });
      get().syncToPresenter();
      return { action: "step" as const, stepIndex: prevIndex };
    } else if (currentSlide > 1) {
      // Go to previous slide
      set({
        currentSlide: currentSlide - 1,
        currentStepIndex: -1,
        isTransitioning: true,
      });
      get().syncToPresenter();
      return { action: "prevSlide" as const };
    } else {
      // Already at start
      return { action: "start" as const };
    }
  },

  toggleBlackScreen: () => {
    set((state) => ({
      isBlackScreen: !state.isBlackScreen,
      isWhiteScreen: false,
    }));
  },

  toggleWhiteScreen: () => {
    set((state) => ({
      isWhiteScreen: !state.isWhiteScreen,
      isBlackScreen: false,
    }));
  },

  startTimer: () => set({ isTimerRunning: true }),
  stopTimer: () => set({ isTimerRunning: false }),
  resetTimer: () => set({ elapsedTime: 0 }),
  tickTimer: () => set((state) => ({ elapsedTime: state.elapsedTime + 1 })),

  setTransitioning: (isTransitioning) => set({ isTransitioning }),

  setPresenterWindow: (win) => set({ presenterWindowRef: win }),

  syncToPresenter: () => {
    const state = get();
    const win = state.presenterWindowRef;
    if (!win || win.closed) return;

    try {
      win.postMessage(
        {
          type: "slideshowUpdate",
          state: {
            currentSlide: state.currentSlide,
            totalSlides: state.totalSlides,
            currentStepIndex: state.currentStepIndex,
            totalSteps: state.steps.length,
            elapsedTime: state.elapsedTime,
            notes: state.notes,
          },
        },
        "*"
      );
    } catch {
      // Window closed or access denied
      set({ presenterWindowRef: null });
    }
  },

  reset: () => set(initialState),
}));

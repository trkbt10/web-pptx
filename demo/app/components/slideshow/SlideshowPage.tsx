/**
 * @file SlideshowPage - Full-featured slideshow viewer
 *
 * PowerPoint-compatible slideshow with:
 * - Click-to-advance animations
 * - Slide transitions
 * - Keyboard/mouse/touch input
 * - Fullscreen support
 * - Progress bar
 *
 * All slide logic is handled inside the iframe (SlideStage).
 * This component only handles:
 * - Input events (keyboard, mouse, touch)
 * - UI controls (progress bar, slide counter, fullscreen)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SlideStage, type SlideStageHandle } from "./SlideStage";
import styles from "./SlideshowPage.module.css";

// Default slide size (will be updated from API)
const DEFAULT_WIDTH = 960;
const DEFAULT_HEIGHT = 720;

type SlideState = {
  currentSlide: number;
  currentStep: number;
  totalSlides: number;
  totalSteps: number;
};

export function SlideshowPage() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();

  const stageRef = useRef<SlideStageHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isReady, setIsReady] = useState(false);
  const [slideState, setSlideState] = useState<SlideState>({
    currentSlide: 1,
    currentStep: -1,
    totalSlides: 1,
    totalSteps: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBlackScreen, setIsBlackScreen] = useState(false);
  const [isWhiteScreen, setIsWhiteScreen] = useState(false);

  // Handle iframe ready
  const handleReady = useCallback(() => {
    setIsReady(true);
    if (fileId && stageRef.current) {
      stageRef.current.init(fileId);
    }
  }, [fileId]);

  // Handle state change from iframe
  const handleStateChange = useCallback((state: SlideState) => {
    setSlideState(state);
  }, []);

  // Handle error from iframe
  const handleError = useCallback((message: string) => {
    setError(message);
  }, []);

  // Navigation
  const advanceNext = useCallback(() => {
    stageRef.current?.next();
  }, []);

  const advancePrevious = useCallback(() => {
    stageRef.current?.prev();
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  }, []);

  // Exit slideshow
  const exitSlideshow = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    navigate(-1);
  }, [navigate]);

  // Keyboard handling
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
        case " ":
        case "Enter":
        case "n":
        case "N":
        case "PageDown":
          e.preventDefault();
          advanceNext();
          break;

        case "ArrowLeft":
        case "ArrowUp":
        case "Backspace":
        case "p":
        case "P":
        case "PageUp":
          e.preventDefault();
          advancePrevious();
          break;

        case "Escape":
          e.preventDefault();
          exitSlideshow();
          break;

        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;

        case "b":
        case "B":
        case ".":
          e.preventDefault();
          setIsBlackScreen(!isBlackScreen);
          setIsWhiteScreen(false);
          break;

        case "w":
        case "W":
        case ",":
          e.preventDefault();
          setIsWhiteScreen(!isWhiteScreen);
          setIsBlackScreen(false);
          break;

        case "Home":
          e.preventDefault();
          stageRef.current?.goto(1);
          break;

        case "End":
          e.preventDefault();
          stageRef.current?.goto(slideState.totalSlides);
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    advanceNext,
    advancePrevious,
    exitSlideshow,
    toggleFullscreen,
    isBlackScreen,
    isWhiteScreen,
    slideState.totalSlides,
  ]);

  // Mouse handling
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (e.button === 0) {
        const target = e.target as HTMLElement;
        if (target.closest(`.${styles.controls}`)) return;
        advanceNext();
      }
    }

    function handleContextMenu(e: MouseEvent) {
      e.preventDefault();
      advancePrevious();
    }

    const container = containerRef.current;
    if (container) {
      container.addEventListener("click", handleClick);
      container.addEventListener("contextmenu", handleContextMenu);
      return () => {
        container.removeEventListener("click", handleClick);
        container.removeEventListener("contextmenu", handleContextMenu);
      };
    }
  }, [advanceNext, advancePrevious]);

  // Touch handling
  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;

    function handleTouchStart(e: TouchEvent) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }

    function handleTouchEnd(e: TouchEvent) {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;

      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;

      if (Math.abs(deltaX) > 50 || Math.abs(deltaY) > 50) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          if (deltaX < 0) {
            advanceNext();
          } else {
            advancePrevious();
          }
        } else {
          if (deltaY < 0) {
            advanceNext();
          } else {
            advancePrevious();
          }
        }
      } else {
        advanceNext();
      }
    }

    const container = containerRef.current;
    if (container) {
      container.addEventListener("touchstart", handleTouchStart);
      container.addEventListener("touchend", handleTouchEnd);
      return () => {
        container.removeEventListener("touchstart", handleTouchStart);
        container.removeEventListener("touchend", handleTouchEnd);
      };
    }
  }, [advanceNext, advancePrevious]);

  // Auto-hide controls
  useEffect(() => {
    let timeoutId: number;

    function handleMouseMove() {
      setShowControls(true);
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        if (isFullscreen) {
          setShowControls(false);
        }
      }, 3000);
    }

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(timeoutId);
    };
  }, [isFullscreen]);

  // Fullscreen change listener
  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          Error: {error}
          <button onClick={exitSlideshow} className={styles.exitButton}>
            Exit
          </button>
        </div>
      </div>
    );
  }

  const { currentSlide, currentStep, totalSlides, totalSteps } = slideState;
  const progress =
    ((currentSlide - 1 + (currentStep + 1) / Math.max(totalSteps, 1)) / totalSlides) * 100;

  return (
    <div
      ref={containerRef}
      className={`${styles.container} ${isFullscreen ? styles.fullscreen : ""}`}
    >
      {/* Black/White screen overlay */}
      {isBlackScreen && <div className={styles.blackScreen} />}
      {isWhiteScreen && <div className={styles.whiteScreen} />}

      {/* Slide stage - all logic is inside iframe */}
      <SlideStage
        ref={stageRef}
        width={DEFAULT_WIDTH}
        height={DEFAULT_HEIGHT}
        onReady={handleReady}
        onStateChange={handleStateChange}
        onError={handleError}
      />

      {/* Controls overlay */}
      <div className={`${styles.controls} ${showControls ? styles.visible : ""}`}>
        {/* Top bar */}
        <div className={styles.topBar}>
          <button onClick={exitSlideshow} className={styles.closeButton}>
            Exit
          </button>
          <div className={styles.slideCounter}>
            {currentSlide} / {totalSlides}
          </div>
          <button onClick={toggleFullscreen} className={styles.fullscreenButton}>
            {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </button>
        </div>

        {/* Progress bar */}
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>

        {/* Navigation arrows */}
        <button
          className={`${styles.navButton} ${styles.prevButton}`}
          onClick={advancePrevious}
          disabled={currentSlide === 1 && currentStep === -1}
        >
          &lt;
        </button>
        <button
          className={`${styles.navButton} ${styles.nextButton}`}
          onClick={advanceNext}
          disabled={currentSlide === totalSlides && currentStep >= totalSteps - 1}
        >
          &gt;
        </button>
      </div>
    </div>
  );
}

export default SlideshowPage;

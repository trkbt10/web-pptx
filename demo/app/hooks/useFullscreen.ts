/**
 * @file Fullscreen hook for slideshow
 *
 * Manages fullscreen state and provides toggle functionality.
 */

import { useState, useEffect, useCallback, type RefObject } from "react";

export function useFullscreen(elementRef: RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Update state when fullscreen changes (including ESC key)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  const enterFullscreen = useCallback(() => {
    const element = elementRef.current;
    if (!element) return;

    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if ((element as unknown as { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen) {
      // Safari support
      (element as unknown as { webkitRequestFullscreen: () => void }).webkitRequestFullscreen();
    }
  }, [elementRef]);

  const exitFullscreen = useCallback(() => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if ((document as unknown as { webkitExitFullscreen?: () => void }).webkitExitFullscreen) {
      // Safari support
      (document as unknown as { webkitExitFullscreen: () => void }).webkitExitFullscreen();
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  return {
    isFullscreen,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
  };
}

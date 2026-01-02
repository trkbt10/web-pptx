/**
 * @file SlideStage - Single iframe container for slideshow
 *
 * Uses one sandboxed iframe that contains the self-contained slideshow engine.
 * All slide fetching, rendering, transitions, and animations happen inside the iframe.
 * Communication via postMessage is minimal: init, next, prev, goto.
 */

import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import styles from "./SlideStage.module.css";

type SlideState = {
  currentSlide: number;
  currentStep: number;
  totalSlides: number;
  totalSteps: number;
};

type Props = {
  width: number;
  height: number;
  onReady?: () => void;
  onStateChange?: (state: SlideState) => void;
  onError?: (message: string) => void;
};

export type SlideStageHandle = {
  init: (fileId: string) => void;
  next: () => void;
  prev: () => void;
  goto: (slideNumber: number) => void;
};

export const SlideStage = forwardRef<SlideStageHandle, Props>(
  function SlideStage({ width, height, onReady, onStateChange, onError }, ref) {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Send message to iframe
    const postMessage = useCallback((message: object) => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(message, "*");
      }
    }, []);

    // Handle messages from iframe
    useEffect(() => {
      function handleMessage(event: MessageEvent) {
        const data = event.data;
        if (!data || typeof data !== "object") return;

        switch (data.type) {
          case "ready":
            onReady?.();
            break;

          case "stateChange":
            onStateChange?.({
              currentSlide: data.currentSlide,
              currentStep: data.currentStep,
              totalSlides: data.totalSlides,
              totalSteps: data.totalSteps,
            });
            break;

          case "error":
            onError?.(data.message);
            break;
        }
      }

      window.addEventListener("message", handleMessage);
      return () => window.removeEventListener("message", handleMessage);
    }, [onReady, onStateChange, onError]);

    // Commands
    const init = useCallback(
      (fileId: string) => {
        postMessage({ type: "init", fileId });
      },
      [postMessage]
    );

    const next = useCallback(() => {
      postMessage({ type: "next" });
    }, [postMessage]);

    const prev = useCallback(() => {
      postMessage({ type: "prev" });
    }, [postMessage]);

    const goto = useCallback(
      (slideNumber: number) => {
        postMessage({ type: "goto", slideNumber });
      },
      [postMessage]
    );

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        init,
        next,
        prev,
        goto,
      }),
      [init, next, prev, goto]
    );

    const frameUrl = `/api/slideshow-frame/${width}/${height}`;

    return (
      <div className={styles.stage}>
        <iframe
          ref={iframeRef}
          src={frameUrl}
          className={styles.iframe}
          sandbox="allow-scripts allow-same-origin"
          referrerPolicy="no-referrer"
          title="Slideshow"
        />
      </div>
    );
  }
);

export default SlideStage;

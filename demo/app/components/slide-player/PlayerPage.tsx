import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import type { PresentationInfo, TimingData } from "@shared/types";
import { useRendererStore } from "../../store/renderer-store";
import { TimingPanel } from "./TimingPanel";
import { PlayerControls } from "./PlayerControls";
import styles from "./PlayerPage.module.css";

export function PlayerPage() {
  const { fileId, slideNum } = useParams<{ fileId: string; slideNum: string }>();
  const navigate = useNavigate();
  const slideNumber = parseInt(slideNum ?? "1", 10);
  const mode = useRendererStore((s) => s.mode);

  const [presentation, setPresentation] = useState<PresentationInfo | null>(null);
  const [timing, setTiming] = useState<TimingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animReady, setAnimReady] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);

  const log = useCallback((msg: string) => {
    setLogs((prev) => [...prev.slice(-50), msg]);
  }, []);

  // Listen for messages from iframe animation player
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;

      switch (data.type) {
        case "animReady":
          setAnimReady(true);
          log("Animation player ready");
          break;
        case "animStart":
          setIsPlaying(true);
          break;
        case "animComplete":
          setIsPlaying(false);
          break;
        case "animLog":
          if (typeof data.message === "string") {
            log(data.message);
          }
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [log]);

  // Reset animReady when slide or mode changes
  useEffect(() => {
    setAnimReady(false);
  }, [fileId, slideNumber, mode]);

  useEffect(() => {
    if (!fileId) return;

    setLoading(true);

    Promise.all([
      fetch(`/api/presentation/${fileId}`).then((r) => r.json()),
      fetch(`/api/timing/${fileId}/${slideNumber}`).then((r) => r.json()),
    ])
      .then(([pres, timingData]) => {
        setPresentation(pres);
        setTiming(timingData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [fileId, slideNumber]);

  const navigateSlide = (delta: number) => {
    if (!presentation) return;
    const newNum = Math.max(1, Math.min(presentation.slideCount, slideNumber + delta));
    if (newNum !== slideNumber) {
      navigate(`/play/${fileId}/${newNum}`);
    }
  };

  const getIframeUrl = () => {
    // Use "anim" mode for the embed when in anim mode
    return `/api/slide/${fileId}/${slideNumber}/embed/${mode}`;
  };

  // Send postMessage to iframe for animation control
  const sendToIframe = (type: string) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage({ type }, "*");
  };

  const handlePlay = () => {
    if (!timing || mode !== "anim" || !animReady) return;
    sendToIframe("play");
  };

  const handleReset = () => {
    if (mode !== "anim" || !animReady) return;
    sendToIframe("reset");
    log("Reset animation");
  };

  const handleShowAll = () => {
    if (mode !== "anim" || !animReady) return;
    sendToIframe("showAll");
    log("Show all shapes");
  };

  const toggleFullscreen = () => {
    if (!fullscreenRef.current) return;

    if (!document.fullscreenElement) {
      fullscreenRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        navigateSlide(-1);
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
        navigateSlide(1);
      } else if (e.key === "Escape" && isFullscreen) {
        document.exitFullscreen();
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [presentation, slideNumber, isFullscreen]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading slide...</div>
      </div>
    );
  }

  if (error || !presentation) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Error: {error || "Slide not found"}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Link to={`/view/${fileId}`} className={styles.backLink}>
            ← Back
          </Link>
          <span className={styles.slideLabel}>
            Slide {slideNumber} of {presentation.slideCount}
          </span>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.navButton} onClick={toggleFullscreen} title="Fullscreen (F)">
            {isFullscreen ? "⛶" : "⛶"}
          </button>
          <button className={styles.navButton} onClick={() => navigateSlide(-1)} disabled={slideNumber <= 1}>
            ←
          </button>
          <button className={styles.navButton} onClick={() => navigateSlide(1)} disabled={slideNumber >= presentation.slideCount}>
            →
          </button>
        </div>
      </div>

      <div className={styles.main}>
        <div className={styles.slidePanel}>
          <div
            ref={fullscreenRef}
            className={`${styles.slideContainer} ${isFullscreen ? styles.fullscreen : ""}`}
            style={{ aspectRatio: isFullscreen ? undefined : `${presentation.size.width} / ${presentation.size.height}` }}
          >
            <iframe
              ref={iframeRef}
              key={`${fileId}-${slideNumber}-${mode}`}
              src={getIframeUrl()}
              className={styles.slideIframe}
              title={`Slide ${slideNumber}`}
            />
            {isFullscreen && (
              <div className={styles.fullscreenControls}>
                <button onClick={() => navigateSlide(-1)} disabled={slideNumber <= 1}>←</button>
                <span>{slideNumber} / {presentation.slideCount}</span>
                <button onClick={() => navigateSlide(1)} disabled={slideNumber >= presentation.slideCount}>→</button>
              </div>
            )}
          </div>

          {mode === "anim" && timing && timing.animationCount > 0 && (
            <PlayerControls
              isPlaying={isPlaying}
              disabled={!animReady}
              onPlay={handlePlay}
              onReset={handleReset}
              onShowAll={handleShowAll}
            />
          )}
        </div>

        <div className={styles.sidePanel}>
          <TimingPanel timing={timing} logs={logs} />
        </div>
      </div>
    </div>
  );
}

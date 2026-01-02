import { Outlet, Link, useLocation } from "react-router-dom";
import { useRendererStore } from "../../store/renderer-store";
import type { RenderMode } from "../../renderers/types";
import styles from "./Layout.module.css";

const RENDER_MODES: { value: RenderMode; label: string; icon: string; description: string }[] = [
  { value: "svg", label: "SVG", icon: "◇", description: "Vector graphics" },
  { value: "html", label: "HTML", icon: "⬡", description: "DOM elements" },
  { value: "anim", label: "Anim", icon: "▷", description: "With animations" },
];

export function Layout() {
  const location = useLocation();
  const { mode, setMode } = useRendererStore();
  const showRendererSelector = location.pathname.startsWith("/play/") || location.pathname.startsWith("/view/");

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link to="/" className={styles.logo}>
            <span className={styles.logoMark}>
              <span className={styles.logoIcon}>▶</span>
            </span>
            <span className={styles.logoText}>PPTX Viewer</span>
          </Link>
        </div>

        {showRendererSelector && (
          <div className={styles.headerCenter}>
            <div className={styles.rendererSelector}>
              <div
                className={styles.rendererIndicator}
                style={{
                  transform: `translateX(${RENDER_MODES.findIndex((m) => m.value === mode) * 100}%)`,
                }}
              />
              {RENDER_MODES.map(({ value, label, icon }) => (
                <button
                  key={value}
                  className={`${styles.rendererButton} ${mode === value ? styles.active : ""}`}
                  onClick={() => setMode(value)}
                  title={RENDER_MODES.find((m) => m.value === value)?.description}
                >
                  <span className={styles.rendererIcon}>{icon}</span>
                  <span className={styles.rendererLabel}>{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={styles.headerRight}>
          {showRendererSelector && (
            <div className={styles.modeHint}>
              <span className={styles.modeHintLabel}>Render Mode</span>
              <span className={styles.modeHintValue}>{RENDER_MODES.find((m) => m.value === mode)?.description}</span>
            </div>
          )}
        </div>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

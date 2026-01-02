import type { ReactNode } from "react";
import type { TimingData } from "@shared/types";
import styles from "./TimingPanel.module.css";

type Props = {
  timing: TimingData | null;
  logs: string[];
};

export function TimingPanel({ timing, logs }: Props) {
  return (
    <div className={styles.panel}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Animation Timeline</h3>
        {timing && timing.animationCount > 0 ? (
          <div className={styles.timingInfo}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{timing.animationCount}</span>
              <span className={styles.statLabel}>Animations</span>
            </div>
            <div className={styles.types}>
              {Object.entries(timing.animationTypes).map(([type, count]) => (
                <span key={type} className={styles.typeBadge}>
                  {type}: {count}
                </span>
              ))}
            </div>
            {timing.rootTimeNode ? <div className={styles.tree}>{renderTimingTree(timing.rootTimeNode, 0)}</div> : null}
          </div>
        ) : (
          <p className={styles.noAnim}>No animations on this slide</p>
        )}
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Debug Log</h3>
        <div className={styles.logContainer}>
          {logs.length > 0 ? logs.map((log, i) => <div key={i} className={styles.logLine}>{log}</div>) : <span className={styles.noLogs}>No logs yet</span>}
        </div>
      </div>
    </div>
  );
}

function renderTimingTree(node: unknown, depth: number): ReactNode {
  if (!node || typeof node !== "object") return null;
  const n = node as Record<string, unknown>;
  const type = String(n.type ?? "unknown");
  const children = Array.isArray(n.children) ? n.children : [];

  const attrs: string[] = [];
  if (n.duration !== undefined) attrs.push(`dur:${n.duration}`);
  if (n.delay !== undefined && n.delay !== 0) attrs.push(`delay:${n.delay}`);
  if (n.presetId !== undefined) attrs.push(`preset:${n.presetId}`);

  let targetInfo = "";
  if (n.target && typeof n.target === "object") {
    const t = n.target as Record<string, unknown>;
    if (t.shapeId) targetInfo = `shape:${t.shapeId}`;
  }

  return (
    <div key={String(n.id ?? depth)} className={styles.treeNode} style={{ marginLeft: depth * 12 }}>
      <span className={`${styles.nodeType} ${styles[type] ?? ""}`}>{type}</span>
      {attrs.length > 0 && <span className={styles.nodeAttr}>{attrs.join(" ")}</span>}
      {targetInfo && <span className={styles.nodeTarget}>{targetInfo}</span>}
      {children.map((child, i) => renderTimingTree(child, depth + 1))}
    </div>
  );
}

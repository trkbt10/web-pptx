/**
 * @file Figma file preview component
 */

import { useMemo, useState } from "react";
import type { ParsedFigFile } from "@oxen/fig/parser";
import type { FigNode } from "@oxen/fig/types";
import { renderFigToSvg } from "../../src/svg/renderer";

type Props = {
  readonly parsedFile: ParsedFigFile;
  readonly onClose: () => void;
};

const styles = {
  container: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    gap: "20px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
  },
  info: {
    display: "flex",
    gap: "16px",
    alignItems: "center",
  },
  stat: {
    padding: "8px 16px",
    background: "rgba(99, 102, 241, 0.1)",
    borderRadius: "8px",
    fontSize: "14px",
  },
  closeButton: {
    padding: "8px 16px",
    fontSize: "14px",
    color: "#fff",
    background: "#4a5568",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  content: {
    flex: 1,
    display: "flex",
    gap: "20px",
  },
  preview: {
    flex: 2,
    background: "#fff",
    borderRadius: "12px",
    overflow: "auto",
    padding: "20px",
  },
  svgContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
  },
  sidebar: {
    flex: 1,
    maxWidth: "400px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "16px",
  },
  nodeList: {
    background: "rgba(255, 255, 255, 0.05)",
    borderRadius: "12px",
    padding: "16px",
    maxHeight: "500px",
    overflowY: "auto" as const,
  },
  nodeListTitle: {
    fontSize: "14px",
    fontWeight: 600,
    marginBottom: "12px",
    color: "#94a3b8",
  },
  nodeItem: {
    padding: "8px 12px",
    marginBottom: "4px",
    background: "rgba(255, 255, 255, 0.03)",
    borderRadius: "6px",
    fontSize: "13px",
    display: "flex",
    justifyContent: "space-between",
  },
  nodeName: {
    color: "#e2e8f0",
  },
  nodeType: {
    color: "#6366f1",
    fontSize: "12px",
  },
  warnings: {
    background: "rgba(251, 191, 36, 0.1)",
    borderRadius: "12px",
    padding: "16px",
  },
  warningsTitle: {
    fontSize: "14px",
    fontWeight: 600,
    marginBottom: "12px",
    color: "#fbbf24",
  },
  warning: {
    padding: "8px 12px",
    marginBottom: "4px",
    background: "rgba(251, 191, 36, 0.05)",
    borderRadius: "6px",
    fontSize: "12px",
    color: "#fbbf24",
  },
  tabs: {
    display: "flex",
    gap: "8px",
    marginBottom: "16px",
  },
  tab: {
    padding: "8px 16px",
    fontSize: "14px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    background: "rgba(255, 255, 255, 0.05)",
    color: "#94a3b8",
  },
  tabActive: {
    background: "#6366f1",
    color: "#fff",
  },
};

export function FigPreview({ parsedFile, onClose }: Props) {
  const [selectedTab, setSelectedTab] = useState<"preview" | "nodes">("preview");

  const renderResult = useMemo(() => {
    // Find canvas nodes (pages)
    const canvasNodes = parsedFile.nodeChanges.filter(
      (n) => getNodeType(n) === "CANVAS"
    );

    // If we have canvases, render the first one's children
    if (canvasNodes.length > 0) {
      const firstCanvas = canvasNodes[0];
      // For now, render all nodes since they're flat from nodeChanges
      return renderFigToSvg(parsedFile.nodeChanges, {
        width: 800,
        height: 600,
        backgroundColor: "#f5f5f5",
      });
    }

    // Otherwise render all nodes
    return renderFigToSvg(parsedFile.nodeChanges, {
      width: 800,
      height: 600,
      backgroundColor: "#f5f5f5",
    });
  }, [parsedFile]);

  const nodeCount = parsedFile.nodeChanges.length;
  const typeCount = countNodeTypes(parsedFile.nodeChanges);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.info}>
          <div style={styles.stat}>
            <strong>{nodeCount}</strong> nodes
          </div>
          <div style={styles.stat}>
            <strong>{typeCount}</strong> types
          </div>
          {renderResult.warnings.length > 0 && (
            <div style={styles.stat}>
              <strong>{renderResult.warnings.length}</strong> warnings
            </div>
          )}
        </div>
        <button style={styles.closeButton} onClick={onClose}>
          Close
        </button>
      </div>

      <div style={styles.tabs}>
        <button
          style={{
            ...styles.tab,
            ...(selectedTab === "preview" ? styles.tabActive : {}),
          }}
          onClick={() => setSelectedTab("preview")}
        >
          Preview
        </button>
        <button
          style={{
            ...styles.tab,
            ...(selectedTab === "nodes" ? styles.tabActive : {}),
          }}
          onClick={() => setSelectedTab("nodes")}
        >
          Nodes
        </button>
      </div>

      <div style={styles.content}>
        {selectedTab === "preview" ? (
          <div style={styles.preview}>
            <div
              style={styles.svgContainer}
              dangerouslySetInnerHTML={{ __html: renderResult.svg }}
            />
          </div>
        ) : (
          <div style={styles.sidebar}>
            <div style={styles.nodeList}>
              <div style={styles.nodeListTitle}>Node Tree</div>
              {parsedFile.nodeChanges.map((node, index) => (
                <div key={index} style={styles.nodeItem}>
                  <span style={styles.nodeName}>{node.name ?? `Node ${index}`}</span>
                  <span style={styles.nodeType}>{getNodeType(node)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {renderResult.warnings.length > 0 && selectedTab === "preview" && (
          <div style={{ ...styles.sidebar, flex: "none", width: "300px" }}>
            <div style={styles.warnings}>
              <div style={styles.warningsTitle}>Render Warnings</div>
              {renderResult.warnings.slice(0, 10).map((warning, index) => (
                <div key={index} style={styles.warning}>
                  {warning}
                </div>
              ))}
              {renderResult.warnings.length > 10 && (
                <div style={styles.warning}>
                  ...and {renderResult.warnings.length - 10} more
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Get node type as string
 */
function getNodeType(node: FigNode): string {
  const nodeData = node as Record<string, unknown>;
  const type = nodeData.type;

  if (typeof type === "string") {
    return type;
  }

  if (type && typeof type === "object" && "name" in type) {
    return (type as { name: string }).name;
  }

  return "UNKNOWN";
}

/**
 * Count unique node types
 */
function countNodeTypes(nodes: readonly FigNode[]): number {
  const types = new Set(nodes.map((n) => getNodeType(n)));
  return types.size;
}

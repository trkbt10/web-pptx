/**
 * @file Symbol resolution for INSTANCE nodes
 */

import type { FigNode } from "@oxen/fig/types";
import { guidToString, type FigGuid } from "@oxen/fig/parser";

// =============================================================================
// Types
// =============================================================================

/**
 * Symbol data structure from INSTANCE nodes
 */
export type FigSymbolData = {
  readonly symbolID: FigGuid;
  readonly symbolOverrides?: readonly FigSymbolOverride[];
};

/**
 * Derived symbol data structure for transform overrides
 * This contains computed transforms for INSTANCE child nodes
 */
export type FigDerivedSymbolData = readonly FigSymbolOverride[];

/**
 * Symbol override entry
 */
export type FigSymbolOverride = {
  readonly guidPath: FigGuidPath;
  readonly [key: string]: unknown;
};

/**
 * GUID path for targeting nested nodes
 */
export type FigGuidPath = {
  readonly guids: readonly FigGuid[];
};

// =============================================================================
// Symbol Override Extraction
// =============================================================================

/**
 * Extract symbolOverrides from an INSTANCE node.
 *
 * Handles both formats:
 * - `symbolData.symbolOverrides` (real Figma exports)
 * - `symbolOverrides` at node's top level (builder-generated files)
 */
export function getInstanceSymbolOverrides(nodeData: Record<string, unknown>): readonly FigSymbolOverride[] | undefined {
  const symbolData = nodeData.symbolData as FigSymbolData | undefined;
  if (symbolData?.symbolOverrides) {
    return symbolData.symbolOverrides;
  }
  return nodeData.symbolOverrides as readonly FigSymbolOverride[] | undefined;
}

// =============================================================================
// Symbol Resolution
// =============================================================================

/**
 * Resolve SYMBOL node from INSTANCE's symbolData
 *
 * @param symbolData - The symbolData from an INSTANCE node
 * @param symbolMap - Map of GUID string to FigNode
 * @returns The referenced SYMBOL node, or undefined if not found
 */
export function resolveSymbol(
  symbolData: FigSymbolData,
  symbolMap: ReadonlyMap<string, FigNode>
): FigNode | undefined {
  const symbolGuidStr = guidToString(symbolData.symbolID);
  return symbolMap.get(symbolGuidStr);
}

/**
 * Look up a node in symbolMap by GUID, with localID fallback.
 *
 * Builder-generated .fig files may have sessionID mismatches between
 * the SYMBOL node's guid and the INSTANCE's symbolID reference.
 * When exact match fails, searches by localID suffix (`:localID`).
 */
export function resolveSymbolByGuid(
  symbolID: FigGuid,
  symbolMap: ReadonlyMap<string, FigNode>,
): FigNode | undefined {
  const exactKey = guidToString(symbolID);
  const exact = symbolMap.get(exactKey);
  if (exact) return exact;

  // Fallback: search by localID suffix
  const localIdSuffix = `:${symbolID.localID}`;
  for (const [key, node] of symbolMap) {
    if (key.endsWith(localIdSuffix)) {
      return node;
    }
  }
  return undefined;
}

/**
 * Resolve a GUID string from symbolMap, with localID fallback.
 * Returns both the resolved node and the actual key in the map.
 */
export function resolveSymbolGuidStr(
  symbolID: FigGuid,
  symbolMap: ReadonlyMap<string, FigNode>,
): { node: FigNode; guidStr: string } | undefined {
  const exactKey = guidToString(symbolID);
  const exact = symbolMap.get(exactKey);
  if (exact) return { node: exact, guidStr: exactKey };

  const localIdSuffix = `:${symbolID.localID}`;
  for (const [key, node] of symbolMap) {
    if (key.endsWith(localIdSuffix)) {
      return { node, guidStr: key };
    }
  }
  return undefined;
}

// =============================================================================
// Node Cloning
// =============================================================================

/**
 * Deep clone a FigNode and its children
 */
function deepCloneNode(node: FigNode): FigNode {
  const children = node.children;
  if (!children || children.length === 0) {
    return { ...node };
  }
  return {
    ...node,
    children: children.map((child) => deepCloneNode(child)),
  };
}

/**
 * Options for cloning symbol children
 */
export type CloneSymbolChildrenOptions = {
  readonly symbolOverrides?: readonly FigSymbolOverride[];
  readonly derivedSymbolData?: FigDerivedSymbolData;
};

/**
 * Clone SYMBOL children for INSTANCE rendering
 *
 * @param symbolNode - The SYMBOL node to clone children from
 * @param options - Optional overrides and derived data to apply
 * @returns Cloned children with overrides applied
 */
export function cloneSymbolChildren(
  symbolNode: FigNode,
  options?: CloneSymbolChildrenOptions
): readonly FigNode[] {
  const children = symbolNode.children ?? [];
  if (children.length === 0) {
    return [];
  }

  // Deep clone children
  const cloned = children.map((child) => deepCloneNode(child));

  // Apply symbol overrides (property overrides)
  if (options?.symbolOverrides && options.symbolOverrides.length > 0) {
    applyOverrides(cloned, options.symbolOverrides);
  }

  // Apply derived symbol data (transform overrides from INSTANCE sizing)
  if (options?.derivedSymbolData && options.derivedSymbolData.length > 0) {
    applyOverrides(cloned, options.derivedSymbolData);
  }

  return cloned;
}

// =============================================================================
// Override Application
// =============================================================================

/**
 * Apply symbol overrides to cloned nodes.
 *
 * Handles both single-level and multi-level guidPaths:
 * - Single-level (guids.length === 1): Applied directly to matching node
 * - Multi-level (guids.length > 1): First GUID targets an intermediate node;
 *   remaining path is propagated as `derivedSymbolData` on that node so the
 *   override is applied when the nested instance is resolved later.
 */
function applyOverrides(
  nodes: FigNode[],
  overrides: readonly FigSymbolOverride[]
): void {
  // Separate direct (depth-1) and nested (depth-N>1) overrides
  const directMap = new Map<string, FigSymbolOverride>();
  const nestedMap = new Map<string, FigSymbolOverride[]>();

  for (const override of overrides) {
    const guids = override.guidPath?.guids;
    if (!guids || guids.length === 0) continue;

    if (guids.length === 1) {
      const key = guidToString(guids[0]);
      directMap.set(key, override);
    } else {
      // Multi-level: key by first GUID, strip it from the path
      const firstKey = guidToString(guids[0]);
      const shortened: FigSymbolOverride = {
        ...override,
        guidPath: { guids: guids.slice(1) },
      };
      let arr = nestedMap.get(firstKey);
      if (!arr) {
        arr = [];
        nestedMap.set(firstKey, arr);
      }
      arr.push(shortened);
    }
  }

  function applyToNode(node: FigNode): void {
    const nodeData = node as Record<string, unknown>;
    const guid = nodeData.guid as FigGuid | undefined;

    if (guid) {
      const guidStr = guidToString(guid);

      // Apply direct override
      const direct = directMap.get(guidStr);
      if (direct) {
        for (const [key, value] of Object.entries(direct)) {
          if (key !== "guidPath") {
            nodeData[key] = value;
          }
        }
      }

      // Propagate nested overrides as derivedSymbolData on this node
      const nested = nestedMap.get(guidStr);
      if (nested && nested.length > 0) {
        const existing = nodeData.derivedSymbolData as FigSymbolOverride[] | undefined;
        nodeData.derivedSymbolData = [...(existing ?? []), ...nested];
      }
    }

    // Recurse to children
    const children = node.children as FigNode[] | undefined;
    if (children) {
      for (const child of children) {
        applyToNode(child);
      }
    }
  }

  for (const node of nodes) {
    applyToNode(node);
  }
}

/**
 * @file Animation Step Extractor
 *
 * Extracts click-to-advance animation steps from PPTX timing tree.
 * Each "step" represents a user click that triggers one or more animations.
 *
 * Click points are identified by:
 * 1. startConditions with delay: "indefinite"
 * 2. nodeType: "clickEffect" or "clickPar"
 *
 * withEffect/afterEffect are auto-play (grouped with previous step)
 */

import type { AnimationStep } from "@shared/types";

// Minimal type definitions for TimeNode (matches domain/animation.ts)
type TimeNodeBase = {
  id: number;
  duration?: number | "indefinite";
  startConditions?: readonly Condition[];
  nodeType?: TimeNodeType;
  preset?: PresetInfo;
};

type Condition = {
  delay?: number | "indefinite";
  event?: string;
};

type TimeNodeType =
  | "tmRoot"
  | "mainSeq"
  | "interactiveSeq"
  | "clickEffect"
  | "withEffect"
  | "afterEffect"
  | "clickPar"
  | "withPar"
  | "afterPar"
  | "withGroup"
  | "afterGroup";

type PresetInfo = {
  id: number;
  class: "entrance" | "exit" | "emphasis" | "motion" | "verb" | "mediaCall";
  subtype?: number;
};

type AnimationTarget = {
  type: "shape" | "slide" | "sound";
  shapeId?: string;
};

type ContainerNode = TimeNodeBase & {
  type: "parallel" | "sequence" | "exclusive";
  children: readonly TimeNode[];
};

type BehaviorNode = TimeNodeBase & {
  type: string;
  target?: AnimationTarget;
};

type TimeNode = ContainerNode | BehaviorNode;

/**
 * Check if a node is a click point (requires user interaction to start)
 */
function isClickPoint(node: TimeNode): boolean {
  // Check startConditions for delay: "indefinite" (click trigger)
  if (node.startConditions?.some((c) => c.delay === "indefinite")) {
    return true;
  }
  // Check nodeType for click-based types
  return node.nodeType === "clickEffect" || node.nodeType === "clickPar";
}

/**
 * Check if a node auto-plays with or after the previous animation
 */
function isAutoPlay(node: TimeNode): boolean {
  return (
    node.nodeType === "withEffect" ||
    node.nodeType === "afterEffect" ||
    node.nodeType === "withPar" ||
    node.nodeType === "afterPar"
  );
}

/**
 * Get auto-advance delay for afterEffect/afterPar nodes
 */
function getAutoAdvanceDelay(node: TimeNode): number | undefined {
  if (node.nodeType === "afterEffect" || node.nodeType === "afterPar") {
    // Check for delay in startConditions
    const delay = node.startConditions?.find((c) => typeof c.delay === "number");
    return delay?.delay as number | undefined;
  }
  return undefined;
}

/**
 * Extract target shape IDs from a node and its children
 */
function extractTargetShapeIds(node: TimeNode): string[] {
  const shapeIds: string[] = [];

  function traverse(n: TimeNode): void {
    // Check if this is a behavior node with a target
    if ("target" in n && n.target?.type === "shape" && n.target.shapeId) {
      shapeIds.push(n.target.shapeId);
    }

    // Traverse children if container
    if ("children" in n && Array.isArray(n.children)) {
      for (const child of n.children) {
        traverse(child);
      }
    }
  }

  traverse(node);
  return [...new Set(shapeIds)]; // dedupe
}

/**
 * Find the main sequence node in the timing tree
 */
function findMainSequence(root: TimeNode): TimeNode | undefined {
  if (root.nodeType === "mainSeq") {
    return root;
  }

  if ("children" in root && Array.isArray(root.children)) {
    for (const child of root.children) {
      const found = findMainSequence(child);
      if (found) return found;
    }
  }

  return undefined;
}

/**
 * Collect all animations from a node tree (flattened)
 */
function collectAnimations(node: TimeNode): TimeNode[] {
  const animations: TimeNode[] = [];

  function traverse(n: TimeNode): void {
    // Add behavior nodes (not containers)
    if (!("children" in n)) {
      animations.push(n);
    }

    // Traverse children
    if ("children" in n && Array.isArray(n.children)) {
      for (const child of n.children) {
        traverse(child);
      }
    }
  }

  traverse(node);
  return animations;
}

/**
 * Extract animation steps from timing data
 *
 * @param rootTimeNode - The root timing node from the parsed PPTX
 * @returns Array of animation steps, each representing a click point
 */
export function extractAnimationSteps(rootTimeNode: unknown): AnimationStep[] {
  if (!rootTimeNode) return [];

  const root = rootTimeNode as TimeNode;
  const mainSeq = findMainSequence(root);

  if (!mainSeq || !("children" in mainSeq)) {
    return [];
  }

  const steps: AnimationStep[] = [];
  let currentStep: AnimationStep | null = null;

  // Process each child of the main sequence
  for (const child of mainSeq.children) {
    if (isClickPoint(child)) {
      // New click point - finalize previous step and start new one
      if (currentStep) {
        steps.push(currentStep);
      }

      const targetShapeIds = extractTargetShapeIds(child);
      const animations = collectAnimations(child);

      currentStep = {
        stepIndex: steps.length,
        animations: animations as unknown[],
        targetShapeIds,
        triggerType: "click",
      };
    } else if (isAutoPlay(child) && currentStep) {
      // Auto-play node - append to current step
      const targetShapeIds = extractTargetShapeIds(child);
      const animations = collectAnimations(child);

      currentStep.animations.push(...(animations as unknown[]));
      currentStep.targetShapeIds = [
        ...new Set([...currentStep.targetShapeIds, ...targetShapeIds]),
      ];

      // Check for auto-advance delay (afterEffect/afterPar)
      const delay = getAutoAdvanceDelay(child);
      if (delay !== undefined) {
        currentStep.autoAdvanceDelay = Math.max(
          currentStep.autoAdvanceDelay ?? 0,
          delay
        );
      }
    } else {
      // Other node types - treat as click point
      if (currentStep) {
        steps.push(currentStep);
      }

      const targetShapeIds = extractTargetShapeIds(child);
      const animations = collectAnimations(child);

      currentStep = {
        stepIndex: steps.length,
        animations: animations as unknown[],
        targetShapeIds,
        triggerType: "click",
      };
    }
  }

  // Don't forget the last step
  if (currentStep) {
    steps.push(currentStep);
  }

  return steps;
}

/**
 * Extract initially hidden shape IDs from timing data
 * Shapes with entrance animations should be hidden initially
 */
export function extractInitiallyHiddenShapes(rootTimeNode: unknown): string[] {
  if (!rootTimeNode) return [];

  const hiddenShapes: string[] = [];

  function traverse(node: TimeNode): void {
    // Check for entrance animations (preset.class === "entrance")
    if (node.preset?.class === "entrance" && "target" in node) {
      const target = (node as BehaviorNode).target;
      if (target?.type === "shape" && target.shapeId) {
        hiddenShapes.push(target.shapeId);
      }
    }

    // Traverse children
    if ("children" in node && Array.isArray(node.children)) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  traverse(rootTimeNode as TimeNode);
  return [...new Set(hiddenShapes)];
}

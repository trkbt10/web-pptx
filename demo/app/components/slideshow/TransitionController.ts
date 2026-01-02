/**
 * @file TransitionController - ECMA-376 Slide Transition Effects
 *
 * Implements all 21 slide transition types defined in ECMA-376:
 * blinds, checker, circle, comb, cover, cut, diamond, dissolve, fade,
 * newsflash, plus, pull, push, random, randomBar, split, strips,
 * wedge, wheel, wipe, zoom
 *
 * Each transition is implemented using CSS properties:
 * - opacity
 * - transform (translate, scale, rotate)
 * - clip-path (inset, circle, polygon)
 * - mask-image (for complex patterns)
 */

import type { TransitionType } from "@shared/types";

export type TransitionDirection =
  | "left"
  | "right"
  | "up"
  | "down"
  | "horizontal"
  | "vertical"
  | "in"
  | "out"
  | "leftUp"
  | "leftDown"
  | "rightUp"
  | "rightDown";

export type TransitionConfig = {
  type: TransitionType;
  duration: number;
  direction?: TransitionDirection;
  spokes?: number; // For wheel transition
};

type StyleState = {
  opacity?: string;
  transform?: string;
  clipPath?: string;
  maskImage?: string;
  webkitMaskImage?: string;
  filter?: string;
  zIndex?: string;
};

type TransitionStyles = {
  outgoing: { initial: StyleState; final: StyleState };
  incoming: { initial: StyleState; final: StyleState };
};

/**
 * Get CSS transition styles for a specific transition type
 */
export function getTransitionStyles(config: TransitionConfig): TransitionStyles {
  const { type, direction = "right" } = config;

  switch (type) {
    case "fade":
      return fadeTransition();

    case "push":
      return pushTransition(direction);

    case "cover":
      return coverTransition(direction);

    case "pull":
      return pullTransition(direction);

    case "wipe":
      return wipeTransition(direction);

    case "split":
      return splitTransition(direction);

    case "blinds":
      return blindsTransition(direction);

    case "checker":
      return checkerTransition();

    case "circle":
      return circleTransition(direction);

    case "diamond":
      return diamondTransition(direction);

    case "plus":
      return plusTransition(direction);

    case "wedge":
      return wedgeTransition();

    case "wheel":
      return wheelTransition(config.spokes || 4);

    case "dissolve":
      return dissolveTransition();

    case "comb":
      return combTransition(direction);

    case "newsflash":
      return newsflashTransition();

    case "strips":
      return stripsTransition(direction);

    case "randomBar":
      return randomBarTransition(direction);

    case "zoom":
      return zoomTransition(direction);

    case "random":
      return getRandomTransition();

    case "cut":
    case "none":
    default:
      return cutTransition();
  }
}

// =============================================================================
// Transition Implementations
// =============================================================================

function fadeTransition(): TransitionStyles {
  return {
    outgoing: {
      initial: { opacity: "1", zIndex: "1" },
      final: { opacity: "0" },
    },
    incoming: {
      initial: { opacity: "0", zIndex: "2" },
      final: { opacity: "1" },
    },
  };
}

function pushTransition(direction: TransitionDirection): TransitionStyles {
  const transforms: Record<string, { out: string; in: string }> = {
    left: { out: "translateX(100%)", in: "translateX(-100%)" },
    right: { out: "translateX(-100%)", in: "translateX(100%)" },
    up: { out: "translateY(100%)", in: "translateY(-100%)" },
    down: { out: "translateY(-100%)", in: "translateY(100%)" },
  };
  const t = transforms[direction] || transforms.right;

  return {
    outgoing: {
      initial: { transform: "translateX(0) translateY(0)", zIndex: "1" },
      final: { transform: t.out },
    },
    incoming: {
      initial: { transform: t.in, zIndex: "2" },
      final: { transform: "translateX(0) translateY(0)" },
    },
  };
}

function coverTransition(direction: TransitionDirection): TransitionStyles {
  const transforms: Record<string, string> = {
    left: "translateX(-100%)",
    right: "translateX(100%)",
    up: "translateY(-100%)",
    down: "translateY(100%)",
  };
  const t = transforms[direction] || transforms.right;

  return {
    outgoing: {
      initial: { opacity: "1", zIndex: "1" },
      final: { opacity: "1" },
    },
    incoming: {
      initial: { transform: t, zIndex: "2" },
      final: { transform: "translateX(0) translateY(0)" },
    },
  };
}

function pullTransition(direction: TransitionDirection): TransitionStyles {
  const transforms: Record<string, string> = {
    left: "translateX(-100%)",
    right: "translateX(100%)",
    up: "translateY(-100%)",
    down: "translateY(100%)",
  };
  const t = transforms[direction] || transforms.right;

  return {
    outgoing: {
      initial: { transform: "translateX(0) translateY(0)", zIndex: "2" },
      final: { transform: t },
    },
    incoming: {
      initial: { opacity: "1", zIndex: "1" },
      final: { opacity: "1" },
    },
  };
}

function wipeTransition(direction: TransitionDirection): TransitionStyles {
  const clips: Record<string, { start: string; end: string }> = {
    left: { start: "inset(0 0 0 100%)", end: "inset(0 0 0 0)" },
    right: { start: "inset(0 100% 0 0)", end: "inset(0 0 0 0)" },
    up: { start: "inset(100% 0 0 0)", end: "inset(0 0 0 0)" },
    down: { start: "inset(0 0 100% 0)", end: "inset(0 0 0 0)" },
  };
  const c = clips[direction] || clips.right;

  return {
    outgoing: {
      initial: { opacity: "1", zIndex: "1" },
      final: { opacity: "1" },
    },
    incoming: {
      initial: { clipPath: c.start, zIndex: "2" },
      final: { clipPath: c.end },
    },
  };
}

function splitTransition(direction: TransitionDirection): TransitionStyles {
  // Split from center or edges
  const isVertical = direction === "vertical";
  const isIn = direction === "in" || direction === "horizontal";

  if (isIn) {
    // Split from edges to center
    return {
      outgoing: {
        initial: { opacity: "1", zIndex: "1" },
        final: { opacity: "1" },
      },
      incoming: {
        initial: {
          clipPath: isVertical
            ? "inset(50% 0 50% 0)"
            : "inset(0 50% 0 50%)",
          zIndex: "2",
        },
        final: { clipPath: "inset(0 0 0 0)" },
      },
    };
  } else {
    // Split from center to edges
    return {
      outgoing: {
        initial: {
          clipPath: "inset(0 0 0 0)",
          zIndex: "2",
        },
        final: {
          clipPath: isVertical
            ? "inset(50% 0 50% 0)"
            : "inset(0 50% 0 50%)",
        },
      },
      incoming: {
        initial: { opacity: "1", zIndex: "1" },
        final: { opacity: "1" },
      },
    };
  }
}

function blindsTransition(direction: TransitionDirection): TransitionStyles {
  const isVertical = direction === "vertical";
  const gradient = isVertical
    ? "repeating-linear-gradient(90deg, transparent 0%, transparent 0%, black 0%, black 10%)"
    : "repeating-linear-gradient(0deg, transparent 0%, transparent 0%, black 0%, black 10%)";
  const finalGradient = isVertical
    ? "repeating-linear-gradient(90deg, transparent 0%, transparent 0%, black 0%, black 100%)"
    : "repeating-linear-gradient(0deg, transparent 0%, transparent 0%, black 0%, black 100%)";

  return {
    outgoing: {
      initial: { opacity: "1", zIndex: "1" },
      final: { opacity: "1" },
    },
    incoming: {
      initial: {
        maskImage: gradient,
        webkitMaskImage: gradient,
        zIndex: "2",
      },
      final: {
        maskImage: finalGradient,
        webkitMaskImage: finalGradient,
      },
    },
  };
}

function checkerTransition(): TransitionStyles {
  // Checkerboard pattern using conic gradient
  const startMask =
    "repeating-conic-gradient(from 0deg, transparent 0deg 90deg, black 90deg 180deg) 0 0 / 10% 10%";
  const endMask =
    "repeating-conic-gradient(from 0deg, black 0deg 90deg, black 90deg 180deg) 0 0 / 100% 100%";

  return {
    outgoing: {
      initial: { opacity: "1", zIndex: "1" },
      final: { opacity: "1" },
    },
    incoming: {
      initial: {
        maskImage: startMask,
        webkitMaskImage: startMask,
        zIndex: "2",
      },
      final: {
        maskImage: endMask,
        webkitMaskImage: endMask,
        opacity: "1",
      },
    },
  };
}

function circleTransition(direction: TransitionDirection): TransitionStyles {
  const isOut = direction === "out";
  const start = isOut ? "circle(100% at 50% 50%)" : "circle(0% at 50% 50%)";
  const end = isOut ? "circle(0% at 50% 50%)" : "circle(100% at 50% 50%)";

  if (isOut) {
    return {
      outgoing: {
        initial: { clipPath: start, zIndex: "2" },
        final: { clipPath: end },
      },
      incoming: {
        initial: { opacity: "1", zIndex: "1" },
        final: { opacity: "1" },
      },
    };
  }

  return {
    outgoing: {
      initial: { opacity: "1", zIndex: "1" },
      final: { opacity: "1" },
    },
    incoming: {
      initial: { clipPath: start, zIndex: "2" },
      final: { clipPath: end },
    },
  };
}

function diamondTransition(direction: TransitionDirection): TransitionStyles {
  const isOut = direction === "out";
  const center = "polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)";
  const full = "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)";

  if (isOut) {
    return {
      outgoing: {
        initial: { clipPath: full, zIndex: "2" },
        final: { clipPath: center },
      },
      incoming: {
        initial: { opacity: "1", zIndex: "1" },
        final: { opacity: "1" },
      },
    };
  }

  return {
    outgoing: {
      initial: { opacity: "1", zIndex: "1" },
      final: { opacity: "1" },
    },
    incoming: {
      initial: { clipPath: center, zIndex: "2" },
      final: { clipPath: full },
    },
  };
}

function plusTransition(direction: TransitionDirection): TransitionStyles {
  const isOut = direction === "out";
  const center = "polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%, 50% 50%)";
  const full = "polygon(33% 0%, 67% 0%, 67% 33%, 100% 33%, 100% 67%, 67% 67%, 67% 100%, 33% 100%, 33% 67%, 0% 67%, 0% 33%, 33% 33%)";

  if (isOut) {
    return {
      outgoing: {
        initial: { clipPath: full, zIndex: "2" },
        final: { clipPath: center },
      },
      incoming: {
        initial: { opacity: "1", zIndex: "1" },
        final: { opacity: "1" },
      },
    };
  }

  return {
    outgoing: {
      initial: { opacity: "1", zIndex: "1" },
      final: { opacity: "1" },
    },
    incoming: {
      initial: { clipPath: center, zIndex: "2" },
      final: { clipPath: full },
    },
  };
}

function wedgeTransition(): TransitionStyles {
  // Wedge from top center, expanding to full
  const start = "polygon(50% 50%, 50% 0%, 50% 0%)";
  const end = "polygon(50% 50%, 0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%)";

  return {
    outgoing: {
      initial: { opacity: "1", zIndex: "1" },
      final: { opacity: "1" },
    },
    incoming: {
      initial: { clipPath: start, zIndex: "2" },
      final: { clipPath: end },
    },
  };
}

function wheelTransition(spokes: number): TransitionStyles {
  // Wheel with N spokes rotating in
  const segments = Math.max(1, spokes);
  const angle = 360 / segments;

  // Generate start polygon (collapsed at center)
  let startPoints = "50% 50%";
  for (let i = 0; i < segments; i++) {
    startPoints += ", 50% 50%";
  }

  // Generate end polygon (full coverage)
  let endPoints = "50% 50%";
  for (let i = 0; i <= segments; i++) {
    const rad = ((i * angle - 90) * Math.PI) / 180;
    const x = 50 + 70 * Math.cos(rad);
    const y = 50 + 70 * Math.sin(rad);
    endPoints += `, ${x}% ${y}%`;
  }

  return {
    outgoing: {
      initial: { opacity: "1", zIndex: "1" },
      final: { opacity: "1" },
    },
    incoming: {
      initial: {
        clipPath: `polygon(${startPoints})`,
        transform: "rotate(-360deg)",
        zIndex: "2",
      },
      final: {
        clipPath: `polygon(${endPoints})`,
        transform: "rotate(0deg)",
      },
    },
  };
}

function dissolveTransition(): TransitionStyles {
  return {
    outgoing: {
      initial: {
        opacity: "1",
        filter: "blur(0px) contrast(1)",
        zIndex: "1",
      },
      final: {
        opacity: "0",
        filter: "blur(8px) contrast(0.5)",
      },
    },
    incoming: {
      initial: {
        opacity: "0",
        filter: "blur(8px) contrast(0.5)",
        zIndex: "2",
      },
      final: {
        opacity: "1",
        filter: "blur(0px) contrast(1)",
      },
    },
  };
}

function combTransition(direction: TransitionDirection): TransitionStyles {
  const isVertical = direction === "vertical";
  const startMask = isVertical
    ? "repeating-linear-gradient(0deg, transparent 0px, transparent 20px, black 20px, black 40px)"
    : "repeating-linear-gradient(90deg, transparent 0px, transparent 20px, black 20px, black 40px)";
  const endMask = isVertical
    ? "repeating-linear-gradient(0deg, black 0px, black 20px, black 20px, black 40px)"
    : "repeating-linear-gradient(90deg, black 0px, black 20px, black 20px, black 40px)";

  return {
    outgoing: {
      initial: { opacity: "1", zIndex: "1" },
      final: { opacity: "1" },
    },
    incoming: {
      initial: {
        maskImage: startMask,
        webkitMaskImage: startMask,
        zIndex: "2",
      },
      final: {
        maskImage: endMask,
        webkitMaskImage: endMask,
      },
    },
  };
}

function newsflashTransition(): TransitionStyles {
  return {
    outgoing: {
      initial: {
        opacity: "1",
        transform: "scale(1) rotate(0deg)",
        zIndex: "1",
      },
      final: {
        opacity: "0",
        transform: "scale(0.3) rotate(-15deg)",
      },
    },
    incoming: {
      initial: {
        opacity: "0",
        transform: "scale(3) rotate(15deg)",
        clipPath: "circle(0% at 50% 50%)",
        zIndex: "2",
      },
      final: {
        opacity: "1",
        transform: "scale(1) rotate(0deg)",
        clipPath: "circle(100% at 50% 50%)",
      },
    },
  };
}

function stripsTransition(direction: TransitionDirection): TransitionStyles {
  const clips: Record<string, { start: string; end: string }> = {
    leftUp: {
      start: "polygon(100% 100%, 100% 100%, 100% 100%)",
      end: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
    },
    leftDown: {
      start: "polygon(100% 0%, 100% 0%, 100% 0%)",
      end: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
    },
    rightUp: {
      start: "polygon(0% 100%, 0% 100%, 0% 100%)",
      end: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
    },
    rightDown: {
      start: "polygon(0% 0%, 0% 0%, 0% 0%)",
      end: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
    },
  };
  const c = clips[direction] || clips.leftDown;

  return {
    outgoing: {
      initial: { opacity: "1", zIndex: "1" },
      final: { opacity: "1" },
    },
    incoming: {
      initial: { clipPath: c.start, zIndex: "2" },
      final: { clipPath: c.end },
    },
  };
}

function randomBarTransition(direction: TransitionDirection): TransitionStyles {
  const isVertical = direction === "vertical";
  // Create random-looking bar pattern
  const bars = [];
  for (let i = 0; i < 20; i++) {
    const size = 5 + Math.random() * 10;
    bars.push(`${size}%`);
  }
  const pattern = bars.join(" ");

  const startMask = isVertical
    ? `repeating-linear-gradient(0deg, transparent, transparent 5%, black 5%, black 10%)`
    : `repeating-linear-gradient(90deg, transparent, transparent 5%, black 5%, black 10%)`;
  const endMask = isVertical
    ? `repeating-linear-gradient(0deg, black 0%, black 100%)`
    : `repeating-linear-gradient(90deg, black 0%, black 100%)`;

  return {
    outgoing: {
      initial: { opacity: "1", zIndex: "1" },
      final: { opacity: "1" },
    },
    incoming: {
      initial: {
        maskImage: startMask,
        webkitMaskImage: startMask,
        zIndex: "2",
      },
      final: {
        maskImage: endMask,
        webkitMaskImage: endMask,
      },
    },
  };
}

function zoomTransition(direction: TransitionDirection): TransitionStyles {
  const isOut = direction === "out";

  if (isOut) {
    return {
      outgoing: {
        initial: { transform: "scale(1)", opacity: "1", zIndex: "2" },
        final: { transform: "scale(1.5)", opacity: "0" },
      },
      incoming: {
        initial: { opacity: "1", zIndex: "1" },
        final: { opacity: "1" },
      },
    };
  }

  return {
    outgoing: {
      initial: { transform: "scale(1)", opacity: "1", zIndex: "1" },
      final: { transform: "scale(0.5)", opacity: "0" },
    },
    incoming: {
      initial: { transform: "scale(1.5)", opacity: "0", zIndex: "2" },
      final: { transform: "scale(1)", opacity: "1" },
    },
  };
}

function cutTransition(): TransitionStyles {
  // Instant switch with no animation
  return {
    outgoing: {
      initial: { opacity: "1", zIndex: "1" },
      final: { opacity: "0" },
    },
    incoming: {
      initial: { opacity: "1", zIndex: "2" },
      final: { opacity: "1" },
    },
  };
}

function getRandomTransition(): TransitionStyles {
  const types: TransitionType[] = [
    "fade", "push", "wipe", "circle", "diamond", "zoom",
    "dissolve", "cover", "split", "wedge",
  ];
  const randomType = types[Math.floor(Math.random() * types.length)];
  return getTransitionStyles({ type: randomType, duration: 500 });
}

/**
 * Apply transition styles to iframe elements
 */
export async function applyTransition(
  outgoing: HTMLIFrameElement,
  incoming: HTMLIFrameElement,
  config: TransitionConfig
): Promise<void> {
  const { duration } = config;
  const styles = getTransitionStyles(config);

  return new Promise((resolve) => {
    // Reset any previous transition styles
    resetStyles(outgoing);
    resetStyles(incoming);

    // Apply initial styles
    applyStyles(outgoing, styles.outgoing.initial);
    applyStyles(incoming, styles.incoming.initial);

    // Force reflow
    void outgoing.offsetHeight;

    // Set up transitions
    const transitionProps = "opacity, transform, clip-path, filter, mask-image";
    outgoing.style.transition = `${transitionProps} ${duration}ms ease-in-out`;
    incoming.style.transition = `${transitionProps} ${duration}ms ease-in-out`;

    // Apply final styles
    requestAnimationFrame(() => {
      applyStyles(outgoing, styles.outgoing.final);
      applyStyles(incoming, styles.incoming.final);
    });

    // Clean up after transition
    setTimeout(() => {
      resetStyles(outgoing);
      resetStyles(incoming);
      resolve();
    }, duration);
  });
}

function applyStyles(el: HTMLElement, styles: StyleState): void {
  if (styles.opacity !== undefined) el.style.opacity = styles.opacity;
  if (styles.transform !== undefined) el.style.transform = styles.transform;
  if (styles.clipPath !== undefined) el.style.clipPath = styles.clipPath;
  if (styles.filter !== undefined) el.style.filter = styles.filter;
  if (styles.zIndex !== undefined) el.style.zIndex = styles.zIndex;
  if (styles.maskImage !== undefined) {
    el.style.maskImage = styles.maskImage;
    (el.style as unknown as { webkitMaskImage: string }).webkitMaskImage = styles.maskImage;
  }
}

function resetStyles(el: HTMLElement): void {
  el.style.transition = "";
  el.style.opacity = "";
  el.style.transform = "";
  el.style.clipPath = "";
  el.style.filter = "";
  el.style.maskImage = "";
  (el.style as unknown as { webkitMaskImage: string }).webkitMaskImage = "";
}

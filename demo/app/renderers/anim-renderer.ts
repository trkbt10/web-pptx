import type { AnimatedSlideRenderer, RenderResult, RendererOptions, TimingData } from "./types";

export function createAnimRenderer(): AnimatedSlideRenderer {
  let containerRef: HTMLElement | null = null;
  let currentShapeIds: string[] = [];
  let state: "idle" | "playing" | "paused" = "idle";
  let onLogCallback: ((msg: string) => void) | undefined;

  function log(msg: string) {
    onLogCallback?.(msg);
  }

  function findShape(id: string): HTMLElement | null {
    return containerRef?.querySelector(`[data-ooxml-id="${id}"]`) ?? null;
  }

  function resetElement(el: HTMLElement) {
    el.style.transition = "none";
    el.style.opacity = "0";
    el.style.visibility = "hidden";
    el.style.transform = "";
    el.style.clipPath = "";
    el.style.filter = "";
  }

  function showElement(el: HTMLElement) {
    el.style.transition = "none";
    el.style.opacity = "1";
    el.style.visibility = "visible";
    el.style.transform = "";
    el.style.clipPath = "";
    el.style.filter = "";
  }

  async function animateFade(el: HTMLElement, duration: number): Promise<void> {
    return new Promise((resolve) => {
      el.style.transition = `opacity ${duration}ms ease-out, visibility 0s`;
      el.style.opacity = "1";
      el.style.visibility = "visible";
      setTimeout(resolve, duration);
    });
  }

  return {
    mode: "anim",
    supportsAnimation: true,

    render(container: HTMLElement, content: string, options: RendererOptions): RenderResult {
      containerRef = container;
      onLogCallback = options.onLog;

      const wrapper = document.createElement("div");
      wrapper.innerHTML = content;
      wrapper.style.width = "100%";
      wrapper.style.height = "100%";

      container.appendChild(wrapper);

      return {
        mode: "anim",
        element: wrapper,
        cleanup: () => {
          containerRef = null;
          currentShapeIds = [];
          state = "idle";
          wrapper.remove();
        },
      };
    },

    async play(timing: TimingData): Promise<void> {
      if (!containerRef || !timing.rootTimeNode) {
        log("No timing data or container");
        return;
      }

      state = "playing";
      currentShapeIds = timing.animatedShapeIds;
      log(`Starting animation with ${currentShapeIds.length} shapes`);

      // Reset all animated shapes first
      for (const id of currentShapeIds) {
        const el = findShape(id);
        if (el) {
          resetElement(el);
        }
      }

      // Simple sequential fade-in for now
      await new Promise((r) => setTimeout(r, 100));

      for (const id of currentShapeIds) {
        if (state !== "playing") break;

        const el = findShape(id);
        if (el) {
          log(`Animating shape ${id}`);
          await animateFade(el, 500);
        }
      }

      state = "idle";
      log("Animation complete");
    },

    pause(): void {
      state = "paused";
      log("Animation paused");
    },

    resume(): void {
      if (state === "paused") {
        state = "playing";
        log("Animation resumed");
      }
    },

    reset(): void {
      state = "idle";
      for (const id of currentShapeIds) {
        const el = findShape(id);
        if (el) {
          resetElement(el);
        }
      }
      log(`Reset ${currentShapeIds.length} shapes`);
    },

    showAll(): void {
      if (!containerRef) return;
      const shapes = containerRef.querySelectorAll("[data-ooxml-id]");
      shapes.forEach((el) => showElement(el as HTMLElement));
      log(`Showing all ${shapes.length} shapes`);
    },

    getState(): "idle" | "playing" | "paused" {
      return state;
    },
  };
}

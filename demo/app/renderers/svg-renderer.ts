import type { SlideRenderer, RenderResult, RendererOptions } from "./types";

export const svgRenderer: SlideRenderer = {
  mode: "svg",
  supportsAnimation: false,

  render(container: HTMLElement, content: string, options: RendererOptions): RenderResult {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = content;
    wrapper.style.width = "100%";
    wrapper.style.height = "100%";

    const svg = wrapper.querySelector("svg");
    if (svg) {
      svg.style.width = "100%";
      svg.style.height = "100%";
    }

    container.appendChild(wrapper);

    return {
      mode: "svg",
      element: wrapper,
      cleanup: () => wrapper.remove(),
    };
  },
};

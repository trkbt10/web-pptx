import type { SlideRenderer, RenderResult, RendererOptions } from "./types";

export const htmlRenderer: SlideRenderer = {
  mode: "html",
  supportsAnimation: false,

  render(container: HTMLElement, content: string, options: RendererOptions): RenderResult {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = content;
    wrapper.style.width = "100%";
    wrapper.style.height = "100%";

    container.appendChild(wrapper);

    return {
      mode: "html",
      element: wrapper,
      cleanup: () => wrapper.remove(),
    };
  },
};

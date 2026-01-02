export type RenderMode = "svg" | "html" | "anim";

export type SlideSize = {
  width: number;
  height: number;
};

export type RendererOptions = {
  slideSize: SlideSize;
  onLog?: (message: string) => void;
};

export type RenderResult = {
  mode: RenderMode;
  element: HTMLElement;
  cleanup: () => void;
};

export interface SlideRenderer {
  readonly mode: RenderMode;
  readonly supportsAnimation: boolean;
  render(container: HTMLElement, content: string, options: RendererOptions): RenderResult;
}

export type TimingData = {
  rootTimeNode: unknown;
  animatedShapeIds: string[];
  animationCount: number;
  animationTypes: Record<string, number>;
};

export interface AnimatedSlideRenderer extends SlideRenderer {
  play(timing: TimingData): Promise<void>;
  pause(): void;
  resume(): void;
  reset(): void;
  showAll(): void;
  getState(): "idle" | "playing" | "paused";
}

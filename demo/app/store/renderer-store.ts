import { create } from "zustand";
import type { RenderMode } from "../renderers/types";

type RendererStore = {
  mode: RenderMode;
  setMode: (mode: RenderMode) => void;
};

export const useRendererStore = create<RendererStore>((set) => ({
  mode: "svg",
  setMode: (mode) => set({ mode }),
}));

import { Hono } from "hono";
import { findPptxFiles } from "../services/pptx-loader";

export const filesRouter = new Hono();

filesRouter.get("/", (c) => {
  const files = findPptxFiles();
  return c.json(files);
});

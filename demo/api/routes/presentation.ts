import { Hono } from "hono";
import { getFileById, getPresentationInfo, getSlideList } from "../services/pptx-loader";

export const presentationRouter = new Hono();

presentationRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const fileInfo = getFileById(id);

  if (!fileInfo) {
    return c.json({ error: "File not found" }, 404);
  }

  try {
    const info = await getPresentationInfo(fileInfo);
    return c.json(info);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
});

presentationRouter.get("/:id/slides", async (c) => {
  const id = c.req.param("id");
  const fileInfo = getFileById(id);

  if (!fileInfo) {
    return c.json({ error: "File not found" }, 404);
  }

  try {
    const slides = await getSlideList(fileInfo);
    return c.json(slides);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
});

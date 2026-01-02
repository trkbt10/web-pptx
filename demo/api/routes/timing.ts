import { Hono } from "hono";
import { getFileById, getTimingData } from "../services/pptx-loader";

export const timingRouter = new Hono();

timingRouter.get("/:id/:num", async (c) => {
  const id = c.req.param("id");
  const num = parseInt(c.req.param("num"), 10);
  const fileInfo = getFileById(id);

  if (!fileInfo) {
    return c.json({ error: "File not found" }, 404);
  }

  try {
    const timing = await getTimingData(fileInfo, num);
    return c.json(timing);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
});

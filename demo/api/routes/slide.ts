import { Hono } from "hono";
import { getFileById, loadPresentation, renderSlide, getTimingData } from "../services/pptx-loader";
import { generateAnimationPlayerScript } from "../animation-player-embed";
import { generateStepPlayerScript } from "../animation-player-step";

export const slideRouter = new Hono();

slideRouter.get("/:id/:num", async (c) => {
  const id = c.req.param("id");
  const num = parseInt(c.req.param("num"), 10);
  const fileInfo = getFileById(id);

  if (!fileInfo) {
    return c.json({ error: "File not found" }, 404);
  }

  try {
    const { presentation } = await loadPresentation(fileInfo);
    const content = await renderSlide(fileInfo, num, "svg");
    return c.json({
      content,
      renderMode: "svg",
      size: presentation.size,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
});

slideRouter.get("/:id/:num/svg", async (c) => {
  const id = c.req.param("id");
  const num = parseInt(c.req.param("num"), 10);
  const fileInfo = getFileById(id);

  if (!fileInfo) {
    return c.json({ error: "File not found" }, 404);
  }

  try {
    const { presentation } = await loadPresentation(fileInfo);
    const content = await renderSlide(fileInfo, num, "svg");
    return c.json({
      content,
      renderMode: "svg",
      size: presentation.size,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
});

slideRouter.get("/:id/:num/html", async (c) => {
  const id = c.req.param("id");
  const num = parseInt(c.req.param("num"), 10);
  const fileInfo = getFileById(id);

  if (!fileInfo) {
    return c.json({ error: "File not found" }, 404);
  }

  try {
    const { presentation } = await loadPresentation(fileInfo);
    const content = await renderSlide(fileInfo, num, "html");
    return c.json({
      content,
      renderMode: "html",
      size: presentation.size,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
});

// Embed endpoint - returns full HTML page for iframe embedding
slideRouter.get("/:id/:num/embed/:mode", async (c) => {
  const id = c.req.param("id");
  const num = parseInt(c.req.param("num"), 10);
  const mode = c.req.param("mode") as "svg" | "html" | "anim" | "slideshow";
  const fileInfo = getFileById(id);

  if (!fileInfo) {
    return c.text("File not found", 404);
  }

  try {
    const { presentation } = await loadPresentation(fileInfo);
    // For anim/slideshow mode, always use HTML rendering
    const renderMode = mode === "anim" || mode === "slideshow" ? "html" : mode;
    const content = await renderSlide(fileInfo, num, renderMode);
    const { width, height } = presentation.size;

    // Get timing data and animation script for anim mode
    let animationScript = "";
    if (mode === "anim") {
      const timingData = await getTimingData(fileInfo, num);
      animationScript = generateAnimationPlayerScript(timingData);
    } else if (mode === "slideshow") {
      animationScript = generateStepPlayerScript();
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #fff; }
    .slide-container {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .slide-content {
      width: ${width}px;
      height: ${height}px;
      transform-origin: center center;
    }
    .slide-content > * { width: 100% !important; height: 100% !important; }
  </style>
  <script>
    function fitSlide() {
      const container = document.querySelector('.slide-container');
      const content = document.querySelector('.slide-content');
      const scaleX = container.clientWidth / ${width};
      const scaleY = container.clientHeight / ${height};
      const scale = Math.min(scaleX, scaleY);
      content.style.transform = 'scale(' + scale + ')';
    }
    window.addEventListener('load', fitSlide);
    window.addEventListener('resize', fitSlide);
  </script>
  ${animationScript ? `<script>${animationScript}</script>` : ""}
</head>
<body>
  <div class="slide-container">
    <div class="slide-content">${content}</div>
  </div>
</body>
</html>`;

    return c.html(html);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.text(message, 500);
  }
});

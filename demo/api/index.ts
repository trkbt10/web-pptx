#!/usr/bin/env bun
/**
 * @file Demo API server for PPTX viewing
 * Provides JSON API endpoints for React frontend
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { filesRouter } from "./routes/files";
import { presentationRouter } from "./routes/presentation";
import { slideRouter } from "./routes/slide";
import { timingRouter } from "./routes/timing";
import { slideshowRouter } from "./routes/slideshow";
import { generateSlideshowFrameScript } from "./slideshow-frame";

const app = new Hono();

// Enable CORS for Vite dev server
app.use(
  "/api/*",
  cors({
    origin: ["http://localhost:5173"],
  }),
);

// API routes
app.route("/api/files", filesRouter);
app.route("/api/presentation", presentationRouter);
app.route("/api/slide", slideRouter);
app.route("/api/timing", timingRouter);
app.route("/api/slideshow", slideshowRouter);

// Health check
app.get("/api/health", (c) => c.json({ status: "ok" }));

// Slideshow frame - returns HTML page for iframe embedding
app.get("/api/slideshow-frame/:width/:height", (c) => {
  const width = parseInt(c.req.param("width"), 10);
  const height = parseInt(c.req.param("height"), 10);

  if (isNaN(width) || isNaN(height)) {
    return c.text("Invalid dimensions", 400);
  }

  const html = generateSlideshowFrameScript(width, height);
  return c.html(html);
});

const port = 6874;
console.log(`PPTX API Server running at http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};

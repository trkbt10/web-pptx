/**
 * @file Media embedding helpers for picture shapes
 */

import * as path from "node:path";
import type { MediaReference } from "@oxen-office/pptx/domain/shape";
import type { MediaType } from "@oxen-office/pptx/patcher/resources/media-manager";
import type { MediaEmbedSpec } from "./types";

export function detectEmbeddedMediaType(spec: MediaEmbedSpec): MediaType {
  const ext = path.extname(spec.path).toLowerCase();
  if (spec.type === "video") {
    if (ext === ".mp4") {
      return "video/mp4";
    }
    throw new Error(`Unsupported video extension: ${ext} (supported: .mp4)`);
  }
  if (spec.type === "audio") {
    if (ext === ".mp3") {
      return "audio/mpeg";
    }
    throw new Error(`Unsupported audio extension: ${ext} (supported: .mp3)`);
  }
  throw new Error(`Unsupported media type: ${(spec as { type: string }).type}`);
}

export function buildMediaReferenceFromSpec(spec: MediaEmbedSpec, rId: string, contentType: string): {
  readonly mediaType: "video" | "audio";
  readonly media: MediaReference;
} {
  if (!spec) {
    throw new Error("media spec is required");
  }
  if (!spec.type) {
    throw new Error("media.type is required");
  }
  if (!spec.path) {
    throw new Error("media.path is required");
  }
  if (!rId) {
    throw new Error("media rId is required");
  }

  if (spec.type === "video") {
    return {
      mediaType: "video",
      media: { videoFile: { link: rId, contentType } },
    };
  }
  return {
    mediaType: "audio",
    media: { audioFile: { link: rId, contentType } },
  };
}


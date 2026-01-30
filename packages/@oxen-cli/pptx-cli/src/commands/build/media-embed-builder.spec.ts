/**
 * @file Tests for media-embed-builder
 */

import { buildMediaReferenceFromSpec, detectEmbeddedMediaType } from "./media-embed-builder";

describe("media-embed-builder", () => {
  it("detects mp4 video and builds MediaReference", () => {
    const mediaType = detectEmbeddedMediaType({ type: "video", path: "movie.mp4" });
    expect(mediaType).toBe("video/mp4");

    const result = buildMediaReferenceFromSpec({ type: "video", path: "movie.mp4" }, "rId5", mediaType);
    expect(result).toEqual({
      mediaType: "video",
      media: { videoFile: { link: "rId5", contentType: "video/mp4" } },
    });
  });

  it("detects mp3 audio and builds MediaReference", () => {
    const mediaType = detectEmbeddedMediaType({ type: "audio", path: "sound.mp3" });
    expect(mediaType).toBe("audio/mpeg");

    const result = buildMediaReferenceFromSpec({ type: "audio", path: "sound.mp3" }, "rId6", mediaType);
    expect(result).toEqual({
      mediaType: "audio",
      media: { audioFile: { link: "rId6", contentType: "audio/mpeg" } },
    });
  });
});


/**
 * @file Tests for OPC utility functions
 *
 * @see ECMA-376 Part 2 (Open Packaging Conventions)
 * @see RFC 3986 (Uniform Resource Identifier: Generic Syntax)
 */

import {
  getMimeTypeFromPath,
  arrayBufferToBase64,
  createDataUrl,
  resolveRelativePath,
  normalizePath,
} from "./utils";

describe("getMimeTypeFromPath", () => {
  it("returns correct MIME type for common image formats", () => {
    expect(getMimeTypeFromPath("image.png")).toBe("image/png");
    expect(getMimeTypeFromPath("image.jpg")).toBe("image/jpeg");
    expect(getMimeTypeFromPath("image.jpeg")).toBe("image/jpeg");
    expect(getMimeTypeFromPath("image.gif")).toBe("image/gif");
    expect(getMimeTypeFromPath("image.svg")).toBe("image/svg+xml");
    expect(getMimeTypeFromPath("image.webp")).toBe("image/webp");
  });

  it("returns correct MIME type for Windows metafile formats", () => {
    expect(getMimeTypeFromPath("image.wmf")).toBe("image/x-wmf");
    expect(getMimeTypeFromPath("image.emf")).toBe("image/x-emf");
  });

  it("returns correct MIME type for video formats", () => {
    expect(getMimeTypeFromPath("video.mp4")).toBe("video/mp4");
    expect(getMimeTypeFromPath("video.webm")).toBe("video/webm");
  });

  it("returns correct MIME type for audio formats", () => {
    expect(getMimeTypeFromPath("audio.mp3")).toBe("audio/mpeg");
    expect(getMimeTypeFromPath("audio.wav")).toBe("audio/wav");
  });

  it("returns undefined for unknown extensions", () => {
    expect(getMimeTypeFromPath("file.unknown")).toBeUndefined();
    expect(getMimeTypeFromPath("file.xyz")).toBeUndefined();
  });

  it("handles paths with directories", () => {
    expect(getMimeTypeFromPath("ppt/media/image1.png")).toBe("image/png");
    expect(getMimeTypeFromPath("a/b/c/d/file.jpeg")).toBe("image/jpeg");
  });

  it("handles case-insensitive extensions", () => {
    expect(getMimeTypeFromPath("image.PNG")).toBe("image/png");
    expect(getMimeTypeFromPath("image.JPG")).toBe("image/jpeg");
  });
});

describe("arrayBufferToBase64", () => {
  it("converts empty buffer to empty string", () => {
    const buffer = new ArrayBuffer(0);
    expect(arrayBufferToBase64(buffer)).toBe("");
  });

  it("converts simple buffer to base64", () => {
    const str = "Hello";
    const encoder = new TextEncoder();
    const buffer = encoder.encode(str).buffer;
    expect(arrayBufferToBase64(buffer)).toBe(btoa(str));
  });
});

describe("createDataUrl", () => {
  it("creates data URL with correct MIME type", () => {
    const str = "test";
    const encoder = new TextEncoder();
    const buffer = encoder.encode(str).buffer;

    const result = createDataUrl(buffer, "image.png");
    expect(result).toBe(`data:image/png;base64,${btoa(str)}`);
  });

  it("uses application/octet-stream for unknown types", () => {
    const str = "test";
    const encoder = new TextEncoder();
    const buffer = encoder.encode(str).buffer;

    const result = createDataUrl(buffer, "file.unknown");
    expect(result).toBe(`data:application/octet-stream;base64,${btoa(str)}`);
  });
});

describe("resolveRelativePath", () => {
  describe("RFC 3986 compliance", () => {
    it("resolves simple relative path from slide", () => {
      // Source: ppt/slides/slide1.xml
      // Target: ../media/image1.png
      // Expected: ppt/media/image1.png
      expect(
        resolveRelativePath("ppt/slides/slide1.xml", "../media/image1.png")
      ).toBe("ppt/media/image1.png");
    });

    it("resolves relative path from diagram", () => {
      // Source: ppt/diagrams/drawing1.xml
      // Target: ../media/image1.jpeg
      // Expected: ppt/media/image1.jpeg
      expect(
        resolveRelativePath("ppt/diagrams/drawing1.xml", "../media/image1.jpeg")
      ).toBe("ppt/media/image1.jpeg");
    });

    it("resolves multiple parent directory references", () => {
      // Source: ppt/slides/layouts/layout1.xml
      // Target: ../../media/image1.png
      // Expected: ppt/media/image1.png
      expect(
        resolveRelativePath("ppt/slides/layouts/layout1.xml", "../../media/image1.png")
      ).toBe("ppt/media/image1.png");
    });

    it("resolves same-directory reference", () => {
      // Source: ppt/slides/slide1.xml
      // Target: slide2.xml
      // Expected: ppt/slides/slide2.xml
      expect(
        resolveRelativePath("ppt/slides/slide1.xml", "slide2.xml")
      ).toBe("ppt/slides/slide2.xml");
    });

    it("handles absolute reference (starting with /)", () => {
      // Absolute paths should return without leading slash
      expect(
        resolveRelativePath("ppt/slides/slide1.xml", "/ppt/media/image.png")
      ).toBe("ppt/media/image.png");
    });

    it("handles already absolute path (starting with ppt/)", () => {
      // If target is already absolute, it should be returned as-is
      expect(
        resolveRelativePath("ppt/slides/slide1.xml", "ppt/media/image.png")
      ).toBe("ppt/slides/ppt/media/image.png");
    });
  });

  describe("directory path handling", () => {
    it("handles directory path as base (ending with /)", () => {
      // When base is a directory (ends with /), it should be used directly
      expect(
        resolveRelativePath("ppt/diagrams/", "../media/image1.png")
      ).toBe("ppt/media/image1.png");
    });

    it("handles same-directory reference with directory base", () => {
      expect(
        resolveRelativePath("ppt/slides/", "image.png")
      ).toBe("ppt/slides/image.png");
    });
  });
});

describe("normalizePath", () => {
  it("returns path starting with ppt/ as-is", () => {
    expect(normalizePath("ppt/slides/slide1.xml")).toBe("ppt/slides/slide1.xml");
    expect(normalizePath("ppt/media/image1.png")).toBe("ppt/media/image1.png");
  });

  it("handles absolute path with leading slash", () => {
    expect(normalizePath("/ppt/slides/slide1.xml")).toBe("ppt/slides/slide1.xml");
  });

  it("handles relative path with ../", () => {
    expect(normalizePath("../diagrams/drawing1.xml")).toBe("ppt/diagrams/drawing1.xml");
    expect(normalizePath("../media/image1.png")).toBe("ppt/media/image1.png");
  });

  it("returns other paths unchanged", () => {
    expect(normalizePath("slides/slide1.xml")).toBe("slides/slide1.xml");
  });
});

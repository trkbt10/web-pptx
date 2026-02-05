/**
 * @file Input types for the ASCII renderer
 *
 * Minimal shape interface the renderer needs.
 * Structurally compatible with ShapeJson from pptx-cli.
 */

export type Bounds = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export type AsciiRenderableShape = {
  readonly name: string;
  readonly type: string;
  readonly bounds?: Bounds;
  readonly text?: string;
  readonly placeholder?: { readonly type?: string };
  readonly content?: { readonly type: string };
  readonly children?: readonly AsciiRenderableShape[];
};

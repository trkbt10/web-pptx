import type { XlsxAlignment } from "../../../xlsx/domain/style/types";

export function parseHorizontalAlignment(value: string): NonNullable<XlsxAlignment["horizontal"]> {
  switch (value) {
    case "left":
    case "center":
    case "right":
    case "fill":
    case "justify":
    case "centerContinuous":
    case "distributed":
      return value;
  }
  throw new Error(`Unknown horizontal alignment: ${value}`);
}

export function parseVerticalAlignment(value: string): NonNullable<XlsxAlignment["vertical"]> {
  switch (value) {
    case "top":
    case "center":
    case "bottom":
    case "justify":
    case "distributed":
      return value;
  }
  throw new Error(`Unknown vertical alignment: ${value}`);
}


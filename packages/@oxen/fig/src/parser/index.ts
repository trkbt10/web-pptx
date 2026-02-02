/**
 * @file Parser module exports
 */

export {
  decompress,
  decompressDeflate,
  decompressDeflateRaw,
  decompressZstd,
  detectCompression,
} from "./decompress";

export { isFigFile, parseFigHeader, getPayload } from "./header";

export {
  parseFigFile,
  parseFigFileSync,
  isValidFigFile,
  isFigmaZipFile,
} from "./fig-file";

export type { ParsedFigFile } from "./fig-file";

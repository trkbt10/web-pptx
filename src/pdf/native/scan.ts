/**
 * @file src/pdf/native/scan.ts
 */











/** lastIndexOfBytes */
export function lastIndexOfBytes(haystack: Uint8Array, needle: Uint8Array): number {
  if (needle.length === 0) {return haystack.length;}
  if (needle.length > haystack.length) {return -1;}
  for (let i = haystack.length - needle.length; i >= 0; i -= 1) {
// eslint-disable-next-line no-restricted-syntax -- Local reassignment keeps this parsing/decoding logic straightforward.
    let ok = true;
    for (let j = 0; j < needle.length; j += 1) {
      if (haystack[i + j] !== needle[j]) {
        ok = false;
        break;
      }
    }
    if (ok) {return i;}
  }
  return -1;
}











/** indexOfBytes */
export function indexOfBytes(haystack: Uint8Array, needle: Uint8Array, from: number): number {
  if (needle.length === 0) {return from;}
  const start = Math.max(0, from);
  for (let i = start; i + needle.length <= haystack.length; i += 1) {
// eslint-disable-next-line no-restricted-syntax -- Local reassignment keeps this parsing/decoding logic straightforward.
    let ok = true;
    for (let j = 0; j < needle.length; j += 1) {
      if (haystack[i + j] !== needle[j]) {
        ok = false;
        break;
      }
    }
    if (ok) {return i;}
  }
  return -1;
}











/** isWhite */
export function isWhite(byte: number): boolean {
  // 0x00 NUL is treated as whitespace in PDFs.
  return (
    byte === 0x00 ||
    byte === 0x09 || // HT
    byte === 0x0a || // LF
    byte === 0x0c || // FF
    byte === 0x0d || // CR
    byte === 0x20 // SP
  );
}











/** isDelimiter */
export function isDelimiter(byte: number): boolean {
  // PDF delimiters: ()<>[]{}/%
  return (
    byte === 0x28 || // (
    byte === 0x29 || // )
    byte === 0x3c || // <
    byte === 0x3e || // >
    byte === 0x5b || // [
    byte === 0x5d || // ]
    byte === 0x7b || // {
    byte === 0x7d || // }
    byte === 0x2f || // /
    byte === 0x25 // %
  );
}


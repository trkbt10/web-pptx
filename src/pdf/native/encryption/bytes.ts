/**
 * @file src/pdf/native/encryption/bytes.ts
 */











/** concatBytes */
export function concatBytes(...parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
// eslint-disable-next-line no-restricted-syntax -- Local reassignment keeps this parsing/decoding logic straightforward.
  let pos = 0;
  for (const p of parts) {
    out.set(p, pos);
    pos += p.length;
  }
  return out;
}











/** int32le */
export function int32le(value: number): Uint8Array {
  const v = value | 0;
  return new Uint8Array([
    v & 0xff,
    (v >>> 8) & 0xff,
    (v >>> 16) & 0xff,
    (v >>> 24) & 0xff,
  ]);
}











/** objKeySalt */
export function objKeySalt(objNum: number, gen: number): Uint8Array {
  const o = objNum >>> 0;
  const g = gen >>> 0;
  return new Uint8Array([
    o & 0xff,
    (o >>> 8) & 0xff,
    (o >>> 16) & 0xff,
    g & 0xff,
    (g >>> 8) & 0xff,
  ]);
}











/** bytesEqual */
export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {return false;}
// eslint-disable-next-line no-restricted-syntax -- Local reassignment keeps this parsing/decoding logic straightforward.
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {diff |= (a[i] ?? 0) ^ (b[i] ?? 0);}
  return diff === 0;
}


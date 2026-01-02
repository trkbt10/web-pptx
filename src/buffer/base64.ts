/**
 * @file Base64 encoding utilities
 */

const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * Convert ArrayBuffer to base64 string
 */
export function base64ArrayBuffer(arrayBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(arrayBuffer);
  const byteLength = bytes.byteLength;
  const byteRemainder = byteLength % 3;
  const mainLength = byteLength - byteRemainder;

  const chunks: string[] = [];

  for (let i = 0; i < mainLength; i += 3) {
    const chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    const a = (chunk & 16515072) >> 18;
    const b = (chunk & 258048) >> 12;
    const c = (chunk & 4032) >> 6;
    const d = chunk & 63;
    chunks.push(BASE64_CHARS[a] + BASE64_CHARS[b] + BASE64_CHARS[c] + BASE64_CHARS[d]);
  }

  if (byteRemainder === 1) {
    const chunk = bytes[mainLength];
    const a = (chunk & 252) >> 2;
    const b = (chunk & 3) << 4;
    chunks.push(BASE64_CHARS[a] + BASE64_CHARS[b] + "==");
  } else if (byteRemainder === 2) {
    const chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];
    const a = (chunk & 64512) >> 10;
    const b = (chunk & 1008) >> 4;
    const c = (chunk & 15) << 2;
    chunks.push(BASE64_CHARS[a] + BASE64_CHARS[b] + BASE64_CHARS[c] + "=");
  }

  return chunks.join("");
}

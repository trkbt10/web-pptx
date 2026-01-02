/**
 * @file Data URL utilities
 */

import { base64ArrayBuffer } from "./base64";

/**
 * Convert ArrayBuffer to data URL
 *
 * @param arrayBuffer - Binary data
 * @param mimeType - MIME type (e.g., "video/mp4", "audio/mpeg")
 * @returns Data URL string
 *
 * @example
 * toDataUrl(buffer, "video/mp4")
 * // Returns: "data:video/mp4;base64,..."
 */
export function toDataUrl(arrayBuffer: ArrayBuffer, mimeType: string): string {
  const base64Data = base64ArrayBuffer(arrayBuffer);
  return `data:${mimeType};base64,${base64Data}`;
}

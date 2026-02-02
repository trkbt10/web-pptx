/**
 * @file Decode blob data from .fig files
 *
 * Figma stores path commands and other data as binary blobs.
 * This module decodes these blobs into usable formats.
 */

// =============================================================================
// Path Command Constants
// =============================================================================

/** MoveTo command (M x y) */
const CMD_MOVE_TO = 0x01;

/** LineTo command (L x y) */
const CMD_LINE_TO = 0x02;

/** Cubic bezier command (C cp1x cp1y cp2x cp2y x y) */
const CMD_CUBIC_TO = 0x04;

/** Quadratic bezier command (Q cpx cpy x y) */
const CMD_QUAD_TO = 0x05;

/** Close path command (Z) */
const CMD_CLOSE = 0x06;

// =============================================================================
// Types
// =============================================================================

/**
 * Blob data as stored in the parsed .fig file
 */
export type FigBlob = {
  readonly bytes: readonly number[];
};

/**
 * Decoded path command
 */
export type PathCommand =
  | { readonly type: "M"; readonly x: number; readonly y: number }
  | { readonly type: "L"; readonly x: number; readonly y: number }
  | { readonly type: "C"; readonly cp1x: number; readonly cp1y: number; readonly cp2x: number; readonly cp2y: number; readonly x: number; readonly y: number }
  | { readonly type: "Q"; readonly cpx: number; readonly cpy: number; readonly x: number; readonly y: number }
  | { readonly type: "Z" };

// =============================================================================
// Path Commands Decoder
// =============================================================================

/**
 * Decode a commands blob to an array of path commands
 */
export function decodePathCommands(blob: FigBlob): readonly PathCommand[] {
  const bytes = blob.bytes;
  const buffer = new Uint8Array(bytes);
  const view = new DataView(buffer.buffer);
  const commands: PathCommand[] = [];
  let offset = 0;

  function readFloat32(): number {
    const val = view.getFloat32(offset, true);
    offset += 4;
    return val;
  }

  function readCommand(): number {
    const cmd = buffer[offset];
    offset += 1;
    return cmd;
  }

  const MAX_ITERATIONS = 100000;
  let iteration = 0;

  while (offset < bytes.length && iteration < MAX_ITERATIONS) {
    iteration++;
    const cmd = readCommand();

    switch (cmd) {
      case CMD_MOVE_TO: {
        const x = readFloat32();
        const y = readFloat32();
        commands.push({ type: "M", x, y });
        break;
      }
      case CMD_LINE_TO: {
        const x = readFloat32();
        const y = readFloat32();
        commands.push({ type: "L", x, y });
        break;
      }
      case CMD_CUBIC_TO:
      case 0x13: {
        // 0x13 appears to be another form of cubic bezier
        const cp1x = readFloat32();
        const cp1y = readFloat32();
        const cp2x = readFloat32();
        const cp2y = readFloat32();
        const x = readFloat32();
        const y = readFloat32();
        commands.push({ type: "C", cp1x, cp1y, cp2x, cp2y, x, y });
        break;
      }
      case CMD_QUAD_TO: {
        const cpx = readFloat32();
        const cpy = readFloat32();
        const x = readFloat32();
        const y = readFloat32();
        commands.push({ type: "Q", cpx, cpy, x, y });
        break;
      }
      case CMD_CLOSE: {
        commands.push({ type: "Z" });
        break;
      }
      case 0x00: {
        // End marker or padding - check if rest is zeros
        if (offset >= bytes.length - 1) {
          offset = bytes.length;
          break;
        }
        let allZeros = true;
        for (let i = offset; i < bytes.length; i++) {
          if (bytes[i] !== 0) {
            allZeros = false;
            break;
          }
        }
        if (allZeros) {
          offset = bytes.length;
        }
        break;
      }
      default: {
        // Unknown command - try to skip to next known command
        let found = false;
        for (let i = offset; i < Math.min(offset + 30, bytes.length); i++) {
          const b = bytes[i];
          if (b === CMD_MOVE_TO || b === CMD_LINE_TO || b === CMD_CUBIC_TO || b === CMD_QUAD_TO || b === CMD_CLOSE || b === 0x13) {
            offset = i;
            found = true;
            break;
          }
        }
        if (!found) {
          offset = bytes.length;
        }
        break;
      }
    }
  }

  return commands;
}

/**
 * Convert path commands to SVG path string
 */
export function pathCommandsToSvgPath(commands: readonly PathCommand[], precision = 2): string {
  const parts: string[] = [];

  for (const cmd of commands) {
    switch (cmd.type) {
      case "M":
        parts.push(`M ${cmd.x.toFixed(precision)} ${cmd.y.toFixed(precision)}`);
        break;
      case "L":
        parts.push(`L ${cmd.x.toFixed(precision)} ${cmd.y.toFixed(precision)}`);
        break;
      case "C":
        parts.push(`C ${cmd.cp1x.toFixed(precision)} ${cmd.cp1y.toFixed(precision)} ${cmd.cp2x.toFixed(precision)} ${cmd.cp2y.toFixed(precision)} ${cmd.x.toFixed(precision)} ${cmd.y.toFixed(precision)}`);
        break;
      case "Q":
        parts.push(`Q ${cmd.cpx.toFixed(precision)} ${cmd.cpy.toFixed(precision)} ${cmd.x.toFixed(precision)} ${cmd.y.toFixed(precision)}`);
        break;
      case "Z":
        parts.push("Z");
        break;
    }
  }

  return parts.join(" ");
}

/**
 * Decode a commands blob directly to SVG path string
 */
export function decodeBlobToSvgPath(blob: FigBlob, precision = 2): string {
  const commands = decodePathCommands(blob);
  return pathCommandsToSvgPath(commands, precision);
}

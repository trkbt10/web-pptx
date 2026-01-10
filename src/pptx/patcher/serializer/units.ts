import type { Degrees, Percent, Pixels } from "../../../ooxml/domain/units";
import { EMU_PER_PIXEL } from "../../domain/defaults";

export function ooxmlBool(value: boolean): "1" | "0" {
  return value ? "1" : "0";
}

/**
 * OOXML angles are stored as 1/60000 of a degree.
 */
export function ooxmlAngleUnits(degrees: Degrees): string {
  return String(Math.round(degrees * 60000));
}

/**
 * OOXML percentages (100000ths): 100000 = 100%.
 */
export function ooxmlPercent100k(percent: Percent): string {
  return String(Math.round((percent / 100) * 100000));
}

/**
 * OOXML percentages (1000ths): 100000 = 100%.
 */
export function ooxmlPercent1000(percent: Percent): string {
  return String(Math.round(percent * 1000));
}

/**
 * Convert CSS pixels back to EMU for OOXML attributes.
 *
 * Parser uses: px = emu * (96 / 914400). So inverse is emu = px * 9525.
 */
export function ooxmlEmu(pixels: Pixels): string {
  return String(Math.round(pixels * EMU_PER_PIXEL));
}


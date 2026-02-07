/** @file TAP extractor tests */
import { extractTapProps } from "./tap-extractor";
import { parseGrpprl } from "../sprm/sprm-decoder";

function pushUint16(arr: number[], value: number): void {
  arr.push(value & 0xff, (value >> 8) & 0xff);
}

function pushInt16(arr: number[], value: number): void {
  const buf = new ArrayBuffer(2);
  new DataView(buf).setInt16(0, value, true);
  const bytes = new Uint8Array(buf);
  arr.push(bytes[0], bytes[1]);
}

describe("extractTapProps", () => {
  it("extracts row height from TDyaRowHeight", () => {
    // sprmTDyaRowHeight(0x9407) = 480 twips
    const bytes: number[] = [];
    pushUint16(bytes, 0x9407);
    pushInt16(bytes, 480);
    const sprms = parseGrpprl(new Uint8Array(bytes));
    const props = extractTapProps(sprms);
    expect(props.rowHeight).toBe(480);
  });

  it("extracts negative row height (exact)", () => {
    // Negative dyaRowHeight means exact height
    const bytes: number[] = [];
    pushUint16(bytes, 0x9407);
    pushInt16(bytes, -240);
    const sprms = parseGrpprl(new Uint8Array(bytes));
    const props = extractTapProps(sprms);
    expect(props.rowHeight).toBe(-240);
  });

  it("extracts header row flag from TTableHeader", () => {
    // sprmTTableHeader(0x3404) = 1 (true)
    const sprms = parseGrpprl(new Uint8Array([0x04, 0x34, 0x01]));
    const props = extractTapProps(sprms);
    expect(props.isHeader).toBe(true);
  });

  it("extracts header row flag = false", () => {
    const sprms = parseGrpprl(new Uint8Array([0x04, 0x34, 0x00]));
    const props = extractTapProps(sprms);
    expect(props.isHeader).toBe(false);
  });

  it("extracts table alignment from TJc", () => {
    // sprmTJc(0x548A) = center (1)
    const bytes: number[] = [];
    pushUint16(bytes, 0x548a);
    pushUint16(bytes, 1);
    const sprms = parseGrpprl(new Uint8Array(bytes));
    const props = extractTapProps(sprms);
    expect(props.alignment).toBe("center");
  });

  it("extracts cell widths from TDefTable", () => {
    // sprmTDefTable(0xD608) — variable-length SPRM (spra=6)
    // Operand: cb(2B) + itcMac(1B) + rgdxaCenter[(itcMac+1) × 2B] + rgtc[...]
    // Build a 3-cell table with widths: 2000, 3000, 2500
    // Centers: [0, 2000, 5000, 7500]
    const itcMac = 3;
    const rgdxaCenter = [0, 2000, 5000, 7500];

    const operandBytes: number[] = [];
    // itcMac
    operandBytes.push(itcMac);
    // rgdxaCenter
    for (const c of rgdxaCenter) {
      pushInt16(operandBytes, c);
    }

    // cb = operandBytes.length (everything after cb)
    const cb = operandBytes.length;

    // Build full SPRM: opcode(2B) + cb(2B) + operand
    const bytes: number[] = [];
    pushUint16(bytes, 0xd608); // opcode
    pushUint16(bytes, cb); // cb (variable-length size)
    bytes.push(...operandBytes);

    const sprms = parseGrpprl(new Uint8Array(bytes));
    const props = extractTapProps(sprms);

    expect(props.cellWidths).toEqual([2000, 3000, 2500]);
  });

  it("returns empty props when no TAP SPRMs present", () => {
    // Only a PAP SPRM (Bold)
    const sprms = parseGrpprl(new Uint8Array([0x35, 0x08, 0x01]));
    const props = extractTapProps(sprms);
    expect(props.rowHeight).toBeUndefined();
    expect(props.isHeader).toBeUndefined();
    expect(props.cellWidths).toBeUndefined();
  });

  it("handles multiple TAP SPRMs together", () => {
    const bytes: number[] = [];

    // TDyaRowHeight = 360
    pushUint16(bytes, 0x9407);
    pushInt16(bytes, 360);

    // TTableHeader = true
    bytes.push(0x04, 0x34, 0x01);

    // TJc = right (2)
    pushUint16(bytes, 0x548a);
    pushUint16(bytes, 2);

    const sprms = parseGrpprl(new Uint8Array(bytes));
    const props = extractTapProps(sprms);
    expect(props.rowHeight).toBe(360);
    expect(props.isHeader).toBe(true);
    expect(props.alignment).toBe("right");
  });
});

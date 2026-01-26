# RK Record (0x007E)

## Overview
- Purpose: 圧縮された数値（RK number）を含むセルを表現
- Location: Sheet substream
- XLSX Mapping: `Cell` with `NumberCellValue`

RK数値はメモリとディスク容量を節約するためのExcel内部フォーマット。

## Binary Structure

| Offset | Size | Field | Description |
|--------|------|-------|-------------|
| 0 | 2 | type | 0x007E |
| 2 | 2 | length | 10 (0x000A) |
| 4 | 2 | rw | Row number (0-based) |
| 6 | 2 | col | Column number (0-based) |
| 8 | 2 | ixfe | Index to XF record |
| 10 | 4 | rk | RK number (see below) |

## RK Number Encoding

RK numberは4バイト（32ビット）で、下位2ビットがエンコーディングタイプを示す:

| Bit 1 | Bit 0 | Type | Description |
|-------|-------|------|-------------|
| 0 | 0 | 0 | IEEE number (上位30ビット + 下位34ビット=0) |
| 0 | 1 | 1 | IEEE number / 100 |
| 1 | 0 | 2 | 30-bit signed integer |
| 1 | 1 | 3 | 30-bit signed integer / 100 |

### Decoding Algorithm

```typescript
function decodeRkNumber(rk: number): number {
  let num: number;

  if (rk & 0x02) {
    // Integer (30-bit signed)
    // Sign-extend from 30 bits
    num = rk >> 2;
    if (num & 0x20000000) {
      // Negative: sign extend
      num = num | 0xC0000000;
    }
  } else {
    // IEEE float (upper 30 bits)
    // Reconstruct 64-bit IEEE from upper 30 bits
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setUint32(4, rk & 0xFFFFFFFC, true);  // Upper 32 bits
    view.setUint32(0, 0, true);                 // Lower 32 bits = 0
    num = view.getFloat64(0, true);
  }

  if (rk & 0x01) {
    // Divide by 100
    num /= 100;
  }

  return num;
}
```

## Parser Implementation

### Input
- `Uint8Array`: RKレコードのデータ部分（10バイト）

### Output
```typescript
type RkRecord = {
  row: number;      // 0-based
  col: number;      // 0-based
  xfIndex: number;  // XF record index
  value: number;    // Decoded floating-point value
};
```

### Parse Logic

```typescript
// src/xls/biff/records/rk.ts
function parseRkRecord(data: Uint8Array): RkRecord {
  const view = new DataView(data.buffer, data.byteOffset);

  const row = view.getUint16(0, true);
  const col = view.getUint16(2, true);
  const xfIndex = view.getUint16(4, true);
  const rk = view.getUint32(6, true);

  return {
    row,
    col,
    xfIndex,
    value: decodeRkNumber(rk),
  };
}
```

## XLSX Mapping

### Target Types
- `Cell` - `src/xlsx/domain/cell/types.ts`
- `NumberCellValue` - `src/xlsx/domain/cell/types.ts`

### Mapping Rules
NUMBER recordと同様:
- `row + 1` → `Cell.address.row`
- `col + 1` → `Cell.address.col`
- `xfIndex` → `Cell.styleId`
- `value` (decoded) → `NumberCellValue.value`

## Test Cases

### Test XLS Generation
```typescript
// scripts/generate-xls-fixtures/rk-numbers.ts
import XLSX from 'xlsx';

const workbook = XLSX.utils.book_new();
const data = [
  [1, 12345678],           // Integer RK
  [1.23, 123456.78],       // Integer/100 RK
  [0.01, 0.99],            // IEEE/100 RK
];
const worksheet = XLSX.utils.aoa_to_sheet(data);
XLSX.utils.book_append_sheet(workbook, worksheet, "RK");

const xlsBytes = XLSX.write(workbook, { type: "buffer", bookType: "xls" });
await Bun.write("fixtures/xls/rk-numbers.xls", xlsBytes);
```

### Expected Result
```typescript
const rk = parseRkRecord(rkData);
expect(rk.value).toBeCloseTo(12345678, 10);
```

### Edge Cases
- [x] 負の整数
- [x] 100で割り切れる数
- [x] 非常に大きな整数
- [x] 精度の限界付近の数

## Checklist
- [x] Spec understanding complete
- [x] Generation script created
- [x] Test XLS generated
- [x] Parser implemented
- [x] Unit tests passing
- [x] XLSX mapping implemented
- [x] Integration tests passing
- [x] Round-trip verification complete

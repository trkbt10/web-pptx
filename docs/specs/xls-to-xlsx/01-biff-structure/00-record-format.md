# BIFF Record Format

## Overview

BIFF（Binary Interchange File Format）は、Excel 97-2007で使用されるバイナリファイルフォーマット。
BIFF8はExcel 97以降で使用されるバージョン。

## Record Structure

全てのBIFFレコードは以下の共通構造を持つ:

| Offset | Size | Field | Description |
|--------|------|-------|-------------|
| 0 | 2 | type | Record type identifier (little-endian) |
| 2 | 2 | length | Data length in bytes (max 8224) |
| 4 | N | data | Record-specific data |

### Byte Order

XLSファイルはIntel x86 little-endian形式を使用する。
マルチバイト値は下位バイトが先に格納される。

```
例: 0x0809 (BOF record type)
バイト列: 09 08
```

### Maximum Record Length

レコードデータの最大長は8224バイト（0x2020）。
これを超えるデータはCONTINUEレコード（0x003C）で分割される。

## Parser Implementation

### Input
- `Uint8Array`: ストリームの生バイト列

### Output
```typescript
type BiffRecord = {
  type: number;      // Record type (16-bit)
  length: number;    // Data length (16-bit)
  data: Uint8Array;  // Record data
  offset: number;    // Position in stream (for debugging)
};
```

### Parse Logic

1. オフセット0から2バイトを読み、レコードタイプを取得（little-endian）
2. オフセット2から2バイトを読み、データ長を取得（little-endian）
3. オフセット4からデータ長分のバイトを読み、レコードデータとして格納
4. 次のレコードへのオフセットを計算: `current_offset + 4 + length`

```typescript
// src/xls/biff/record-reader.ts
function readRecord(bytes: Uint8Array, offset: number): BiffRecord {
  const view = new DataView(bytes.buffer, bytes.byteOffset + offset);
  const type = view.getUint16(0, true);  // little-endian
  const length = view.getUint16(2, true);
  const data = bytes.slice(offset + 4, offset + 4 + length);
  return { type, length, data, offset };
}
```

## Record Types (Constants)

```typescript
// src/xls/biff/record-types.ts
export const BIFF_RECORD_TYPES = {
  // Foundation
  BOF: 0x0809,
  EOF: 0x000A,
  CONTINUE: 0x003C,

  // Workbook globals
  BOUNDSHEET: 0x0085,
  SST: 0x00FC,
  EXTSST: 0x00FF,
  FONT: 0x0231,
  FORMAT: 0x041E,
  XF: 0x00E0,
  STYLE: 0x0293,
  PALETTE: 0x0092,

  // Sheet structure
  DIMENSIONS: 0x0200,
  ROW: 0x0208,
  COLINFO: 0x007D,
  DEFCOLWIDTH: 0x0055,
  DEFAULTROWHEIGHT: 0x0225,
  MERGECELLS: 0x00E5,

  // Cell records
  BLANK: 0x0201,
  MULBLANK: 0x00BE,
  NUMBER: 0x0203,
  RK: 0x007E,
  MULRK: 0x00BD,
  LABELSST: 0x00FD,
  BOOLERR: 0x0205,
  FORMULA: 0x0006,
  STRING: 0x0207,

  // Other
  CODEPAGE: 0x0042,
  COUNTRY: 0x008C,
  DATEMODE: 0x0022,
  WINDOW1: 0x003D,
  WINDOW2: 0x023E,
} as const;

export type BiffRecordType = typeof BIFF_RECORD_TYPES[keyof typeof BIFF_RECORD_TYPES];
```

## Stream Iterator

```typescript
// src/xls/biff/stream-iterator.ts
function* iterateRecords(bytes: Uint8Array): Generator<BiffRecord> {
  let offset = 0;
  while (offset < bytes.length) {
    const record = readRecord(bytes, offset);
    yield record;
    offset += 4 + record.length;
  }
}
```

## Test Cases

### Test XLS Generation
最小限のXLSファイルを生成し、レコード構造を検証。

### Expected Behavior
- BOFレコードが最初に出現
- EOFレコードでストリームが終了
- 各レコードのtype/lengthが正しく読み取れる

### Edge Cases
- [x] 空のストリーム
- [x] 不正なレコード長
- [x] ストリーム末尾での切り詰め

## Checklist
- [x] Spec understanding complete
- [x] Parser implemented
- [x] Unit tests passing
- [x] Integration tests passing

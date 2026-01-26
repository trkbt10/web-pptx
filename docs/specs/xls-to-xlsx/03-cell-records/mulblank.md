# MULBLANK (0x00BE)

## Overview

MULBLANK は、同一行内の連続する空セル（BLANK）を 1 レコードに圧縮したセルレコードです。

本実装では 1 レコードを展開し、`colFirst..colLast` の各列に対して `CellValue.type = "empty"` を生成します。列ごとの `xfIndex` は配列で保持されます。

## Payload Layout

リトルエンディアン。

| Offset | Size | Field | Type |
|--------|------|-------|------|
| 0 | 2 | `row` | `uint16` |
| 2 | 2 | `colFirst` | `uint16` |
| 4 | 2 * N | `xfIndexes[]` | `uint16[N]` |
| 4 + 2*N | 2 | `colLast` | `uint16` |

ここで `N = colLast - colFirst + 1`。

### Validation

- `payload.length >= 8` でなければ `throw`
- `colLast < colFirst` なら `throw`
- `payload.length === 2 + 2 + (N * 2) + 2` でなければ `throw`

## Mapping

レコードを展開し、各 `i in [0..N)` について:

- 対象セル座標: `(row, colFirst + i)`
- 値: `empty`
- スタイル: `xfIndexes[i]` を参照して XLSX の cell style にマッピング


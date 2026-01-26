# MULRK (0x00BD)

## Overview

MULRK は、同一行内の連続する数値セル（RK 形式）を 1 レコードに圧縮したセルレコードです。

本実装では 1 レコードを展開し、`colFirst..colLast` の各列に対して数値セルを生成します。各セルには列ごとの `xfIndex` と `rk` が含まれます。

## Payload Layout

リトルエンディアン。

| Offset | Size | Field | Type |
|--------|------|-------|------|
| 0 | 2 | `row` | `uint16` |
| 2 | 2 | `colFirst` | `uint16` |
| 4 | 6 * N | `rkrec[]` | `rkrec[N]` |
| 4 + 6*N | 2 | `colLast` | `uint16` |

`rkrec` は下記の 6 バイト:

| Offset (within rkrec) | Size | Field | Type |
|-----------------------|------|-------|------|
| 0 | 2 | `xfIndex` | `uint16` |
| 2 | 4 | `rk` | `uint32` |

ここで `N = colLast - colFirst + 1`。

### Validation

- `payload.length >= 12` でなければ `throw`（最小: row(2)+colFirst(2)+rkrec(6)+colLast(2)）
- `colLast < colFirst` なら `throw`
- `payload.length === 2 + 2 + (N * 6) + 2` でなければ `throw`

## Mapping

レコードを展開し、各 `i in [0..N)` について:

- 対象セル座標: `(row, colFirst + i)`
- 値: `decodeRkNumber(rkrec[i].rk)` を `CellValue.type = "number"` として格納
- スタイル: `rkrec[i].xfIndex` を参照して XLSX の cell style にマッピング


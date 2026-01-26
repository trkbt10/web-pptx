# BLANK (0x0201)

## Overview

BLANK は「値を持たないセル」を表すセルレコードです。値は格納されず、セルの表示（書式）のみを指定します。

本実装では BLANK を `CellValue.type = "empty"` として扱い、XF によるスタイルのみをセルへ適用します。

## Payload Layout

リトルエンディアン。

| Offset | Size | Field | Type |
|--------|------|-------|------|
| 0 | 2 | `row` | `uint16` |
| 2 | 2 | `col` | `uint16` |
| 4 | 2 | `xfIndex` | `uint16` |

### Validation

- `payload.length === 6` でなければ `throw`

## Mapping

- 対象セル座標: `(row, col)`
- 値: `empty`
- スタイル: `xfIndex` を参照して XLSX の cell style にマッピング


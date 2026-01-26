# Cell Records Implementation Checklist

## Records

| Record | Type | Spec | Script | Fixture | Parser | Mapping | Tests |
|--------|------|------|--------|---------|--------|---------|-------|
| NUMBER | 0x0203 | [x] | [x] | [x] | [x] | [x] | [x] |
| RK | 0x007E | [x] | [x] | [x] | [x] | [x] | [x] |
| MULRK | 0x00BD | [x] | [x] | [x] | [x] | [x] | [x] |
| LABELSST | 0x00FD | [x] | [x] | [x] | [x] | [x] | [x] |
| BLANK | 0x0201 | [x] | [x] | [x] | [x] | [x] | [x] |
| MULBLANK | 0x00BE | [x] | [x] | [x] | [x] | [x] | [x] |
| BOOLERR | 0x0205 | [x] | [x] | [x] | [x] | [x] | [x] |
| FORMULA | 0x0006 | [x] | [x] | [x] | [x] | [x] | [x] |
| STRING | 0x0207 | [x] | [x] | [x] | [x] | [x] | [x] |

## Implementation Status

### Completed
- [x] `src/xls/biff/records/number.ts`
- [x] `src/xls/biff/records/rk.ts`
- [x] `src/xls/biff/records/labelsst.ts`
- [x] `src/xls/biff/records/mulrk.ts`
- [x] `src/xls/biff/records/blank.ts`
- [x] `src/xls/biff/records/mulblank.ts`
- [x] `src/xls/biff/records/boolerr.ts`
- [x] `src/xls/biff/records/formula.ts`
- [x] `src/xls/biff/records/string.ts`

### Pending
 (none)

## Dependencies

- SST Record (`02-workbook-records/sst.md`) - Required for LABELSST resolution
- XF Record (`02-workbook-records/xf.md`) - Required for style mapping

## Cell Value Types Mapping

| XLS Record | XLS Value | XLSX CellValue.type |
|------------|-----------|---------------------|
| NUMBER | IEEE float | "number" |
| RK | RK number | "number" |
| MULRK | RK number[] | "number" |
| LABELSST | SST index | "string" |
| BLANK | (none) | "empty" |
| MULBLANK | (none)[] | "empty" |
| BOOLERR | bool/error | "boolean" or "error" |
| FORMULA | expression | "number"/"string"/"boolean"/"error" + formula |

## Notes

### RK vs NUMBER
- ExcelはNUMBERよりRKを優先使用
- 読み込み時は両方をサポート必要
- 出力時はXLSX（XML）のためRK不要

### MULRK / MULBLANK
- 同一行の連続セルを1レコードに圧縮
- 展開して個別セルとして処理

### FORMULA
- 数式の結果はFORMULAレコード内に格納
- 結果が文字列の場合はSTRINGレコードが続く
- 数式テキスト（XLSX `<f>`）はBIFF token（rgce）を **best-effort** に文字列化して出力。未対応 token を含む場合は数式を省略し、キャッシュ値のみを保持する。

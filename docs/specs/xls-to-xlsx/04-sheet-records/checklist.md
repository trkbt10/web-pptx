# Sheet Records Implementation Checklist

## Records

| Record | Type | Spec | Script | Fixture | Parser | Mapping | Tests |
|--------|------|------|--------|---------|--------|---------|-------|
| DIMENSIONS | 0x0200 | [x] | [x] | [x] | [x] | [x] | [x] |
| ROW | 0x0208 | [x] | [x] | [x] | [x] | [x] | [x] |
| COLINFO | 0x007D | [x] | [x] | [x] | [x] | [x] | [x] |
| MERGECELLS | 0x00E5 | [x] | [x] | [x] | [x] | [x] | [x] |
| DEFCOLWIDTH | 0x0055 | [x] | [x] | [x] | [x] | [x] | [x] |
| DEFAULTROWHEIGHT | 0x0225 | [x] | [x] | [x] | [x] | [x] | [x] |

## Implementation Status

- [x] `src/xls/biff/records/dimensions.ts`
- [x] `src/xls/biff/records/row.ts`
- [x] `src/xls/biff/records/colinfo.ts`
- [x] `src/xls/biff/records/mergecells.ts`
- [x] `src/xls/biff/records/defcolwidth.ts`
- [x] `src/xls/biff/records/defaultrowheight.ts`

## Dependencies

- Workbook Records (`02-workbook-records/`) - BOF/EOF for substream detection
- BIFF Structure (`01-biff-structure/`) - Record parsing foundation

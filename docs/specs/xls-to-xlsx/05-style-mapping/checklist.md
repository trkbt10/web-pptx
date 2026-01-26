# Style Mapping Implementation Checklist

## Components

| Component | XLS Source | XLSX Target | Spec | Impl | Tests |
|-----------|------------|-------------|------|------|-------|
| Fonts | FONT record | XlsxFont | [x] | [x] | [x] |
| Fills | XF record | XlsxFill | [x] | [x] | [x] |
| Borders | XF record | XlsxBorder | [x] | [x] | [x] |
| Number Formats | FORMAT record | numberFormats | [x] | [x] | [x] |
| Colors | Indexed/RGB | XlsxColor | [x] | [x] | [x] |
| Alignment | XF record | alignment | [x] | [x] | [x] |

## Implementation Status

- [x] `src/xls/converter/fonts.ts`
- [x] `src/xls/converter/fills.ts`
- [x] `src/xls/converter/borders.ts`
- [x] `src/xls/converter/number-formats.ts`
- [x] `src/xls/converter/colors.ts`
- [x] `src/xls/converter/indexed-colors.ts`
- [x] `src/xls/converter/alignment.ts`
- [x] `src/xls/converter/cell-styles.ts`
- [x] `src/xls/converter/styles.ts` (main orchestrator)

## Font Mapping

| XLS Field | XLSX Field |
|-----------|------------|
| dyHeight (twips) | sz (points) = dyHeight / 20 |
| bls | bold (700=bold) |
| fItalic | italic |
| uls | underline |
| bFamily | family |
| bCharSet | charset |
| icv | color (indexed/RGB) |
| name | name |

## Fill Mapping

| XLS Pattern | XLSX Pattern |
|-------------|--------------|
| 0x00 | none |
| 0x01 | solid |
| 0x02 | mediumGray |
| 0x03 | darkGray |
| ... | ... |

## Border Mapping

| XLS Style | XLSX Style |
|-----------|------------|
| 0x00 | none |
| 0x01 | thin |
| 0x02 | medium |
| 0x03 | dashed |
| 0x04 | dotted |
| 0x05 | thick |
| 0x06 | double |
| 0x07 | hair |
| ... | ... |

## Color Palette

XLSは64色の標準パレット + カスタムパレット（PALETTE record）を使用。

| Index | Default Color |
|-------|---------------|
| 0x08 | Black |
| 0x09 | White |
| 0x0A | Red |
| 0x0B | Lime |
| 0x0C | Blue |
| ... | ... |

### Color Resolution

1. インデックス 0x00-0x07: システムウィンドウ色
2. インデックス 0x08-0x3F: 標準パレット
3. インデックス 0x40+: カスタムパレット（PALETTE record）
4. インデックス 0x7FFF: 自動色

## Number Format Mapping

組み込みフォーマット（ifmt 0x00-0x31）は内部テーブルから解決。
カスタムフォーマット（ifmt 0xA4+）はFORMAT recordから取得。

## Dependencies

- XF Record (`02-workbook-records/xf.md`)
- FONT Record (`02-workbook-records/font.md`)
- FORMAT Record (`02-workbook-records/format.md`)
- PALETTE Record (optional)

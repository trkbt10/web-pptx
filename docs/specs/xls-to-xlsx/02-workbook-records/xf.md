# XF Record (0x00E0)

## Overview
- Purpose: セルまたはスタイルのフォーマット情報を格納
- Location: Workbook globals
- XLSX Mapping: `XlsxStyleSheet.cellXfs`, `XlsxStyleSheet.cellStyleXfs`

XFレコードには2種類ある:
- Cell XF: セルの直接書式
- Style XF: 名前付きスタイルの書式

## Binary Structure (BIFF8 Cell XF)

| Offset | Size | Field | Description |
|--------|------|-------|-------------|
| 0 | 2 | type | 0x00E0 |
| 2 | 2 | length | 20 (0x0014) |
| 4 | 2 | ifnt | Font index (0-based) |
| 6 | 2 | ifmt | Number format index |
| 8 | 2 | fLocked, fHidden, xfType | Type and protection |
| 10 | 1 | alc | Horizontal alignment |
| 11 | 1 | fWrap, alcV, etc. | Vertical alignment, wrap |
| 12 | 1 | trot | Text rotation (0-180, 255=vertical) |
| 13 | 1 | cIndent, fShrinkToFit | Indentation |
| 14 | 2 | (reserved) | Reserved |
| 16 | 4 | border flags | Border line styles |
| 20 | 4 | color/fill flags | Border colors, fill pattern |

### Alignment (alc field)

| Value | Description |
|-------|-------------|
| 0 | General |
| 1 | Left |
| 2 | Center |
| 3 | Right |
| 4 | Fill |
| 5 | Justify |
| 6 | Center across selection |
| 7 | Distributed |

### Vertical Alignment (alcV in offset 11)

| Value | Description |
|-------|-------------|
| 0 | Top |
| 1 | Center |
| 2 | Bottom |
| 3 | Justify |
| 4 | Distributed |

### Built-in Number Formats (ifmt)

| Index | Format |
|-------|--------|
| 0x00 | General |
| 0x01 | 0 |
| 0x02 | 0.00 |
| 0x03 | #,##0 |
| 0x04 | #,##0.00 |
| 0x09 | 0% |
| 0x0A | 0.00% |
| 0x0E | m/d/yy |
| 0x0F | d-mmm-yy |
| 0x10 | d-mmm |
| 0x11 | mmm-yy |
| 0x12 | h:mm AM/PM |
| ... | ... |

## Parser Implementation

### Output
```typescript
type XfRecord = {
  fontIndex: number;
  formatIndex: number;
  isStyle: boolean;
  isLocked: boolean;
  isHidden: boolean;
  parentXfIndex: number;
  alignment: {
    horizontal: HorizontalAlignment;
    vertical: VerticalAlignment;
    wrapText: boolean;
    textRotation: number;
    indent: number;
    shrinkToFit: boolean;
  };
  border: {
    left: BorderStyle;
    right: BorderStyle;
    top: BorderStyle;
    bottom: BorderStyle;
    diagonal: BorderStyle;
  };
  fill: {
    patternType: FillPattern;
    foregroundColor: number;  // Color index
    backgroundColor: number;  // Color index
  };
};
```

## XLSX Mapping

### Target Types
- `XlsxStyleSheet` - `src/xlsx/domain/style/types.ts`
- `XlsxCellXf` - cellXfs entry

### Mapping Rules
- `fontIndex` → `XlsxCellXf.fontId`
- `formatIndex` → `XlsxCellXf.numFmtId`
- `alignment.*` → `XlsxCellXf.alignment`
- `border.*` → `XlsxCellXf.borderId` (borders配列へのインデックス)
- `fill.*` → `XlsxCellXf.fillId` (fills配列へのインデックス)

## Test Cases

### Expected Result
```typescript
const xf = parseXfRecord(xfData);
expect(xf.fontIndex).toBe(0);
expect(xf.alignment.horizontal).toBe("center");
```

### Edge Cases
- [x] Style XF vs Cell XF
- [x] 全ての水平配置タイプ
- [x] 全ての垂直配置タイプ
- [x] テキスト回転（0-90, 91-180, 255）
- [x] カスタム数値フォーマット参照

## Checklist
- [x] Spec understanding complete
- [x] Generation script created
- [x] Test XLS generated
- [x] Parser implemented
- [x] Unit tests passing
- [x] XLSX mapping implemented
- [x] Integration tests passing
- [x] Round-trip verification complete

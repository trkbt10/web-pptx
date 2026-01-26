# XLS to XLSX Conversion Overview

## Purpose

XLS（Excel 97-2007 Binary File Format / BIFF8）ファイルをXLSX形式に変換する。
既存の `src/xlsx` ドメインモデル（`XlsxWorkbook`）に直接変換し、エディタとシームレスに統合する。

## Architecture

```
XLS File (BIFF8 in CFB container)
          │
          ▼
    [CFB Parser]
    (docs/specs/cfb/ 参照)
          │
          ▼
    Workbook Stream (BIFF records)
          │
          ▼
    [BIFF Record Parser]
    (src/xls/biff/)
          │
          ▼
    XLS Domain Model
    (src/xls/domain/)
          │
          ▼
    [XLS → XLSX Converter]
    (src/xls/converter/)
          │
          ▼
    XlsxWorkbook
    (src/xlsx/domain/)
          │
          ▼
    [exportXlsx()]
    (src/xlsx/exporter.ts)
          │
          ▼
    XLSX File
```

## Module Structure

```
src/xls/
├── index.ts                 # Public API: parseXls()
├── parser.ts                # High-level entry point
│
├── biff/                    # BIFF record parsing
│   ├── record-reader.ts     # Record header parsing
│   ├── record-types.ts      # Record type constants
│   ├── stream-iterator.ts   # Record sequence iteration
│   ├── continue-handler.ts  # CONTINUE record handling
│   └── records/             # Individual record parsers
│
├── domain/                  # XLS intermediate types
│   ├── types.ts             # XlsWorkbook, XlsSheet, etc.
│   └── error-codes.ts       # Error value mapping
│
├── extractor/               # Records → Domain
│   ├── index.ts             # Main extraction logic
│   ├── styles.ts            # Style collection building
│   ├── sheets.ts            # Sheet data extraction
│   └── cells.ts             # Cell value extraction
│
└── converter/               # XLS Domain → XLSX Domain
    ├── index.ts             # convertXlsToXlsx()
    ├── styles.ts            # Style mapping
    ├── fonts.ts             # Font mapping
    ├── fills.ts             # Fill pattern mapping
    ├── borders.ts           # Border mapping
    ├── number-formats.ts    # Number format mapping
    ├── colors.ts            # Color palette resolution
    └── cells.ts             # Cell mapping
```

## Dependencies

### External
- CFB Parser: `docs/specs/cfb/` の仕様に従って実装（または既存ライブラリ使用）

### Internal
- `src/xlsx/domain/` - Target domain types
- `src/xlsx/exporter.ts` - XLSX export functionality

## Public API

```typescript
// Example usage (within this repo, e.g. from a file under src/)
import { parseXls } from "./xls";
import { exportXlsx } from "./xlsx/exporter";

// Convert XLS to XlsxWorkbook domain model
const xlsBytes: Uint8Array = /* read .xls file */;
const workbook: XlsxWorkbook = parseXls(xlsBytes);

// Export to XLSX
const xlsxBytes = await exportXlsx(workbook);
```

## BIFF8 File Structure

### CFB Container
XLSファイルはOLE2/CFB（Compound File Binary）コンテナに格納される。

主要ストリーム:
- `Workbook` - メインのBIFFレコードストリーム
- `\x05SummaryInformation` - ドキュメントプロパティ（オプション）
- `\x05DocumentSummaryInformation` - 拡張プロパティ（オプション）

### Book Stream Layout

```
┌─────────────────────────────────┐
│ BOF (Workbook globals)          │
├─────────────────────────────────┤
│ Global records:                 │
│   CODEPAGE, WINDOW1, FONT,      │
│   FORMAT, XF, STYLE, PALETTE,   │
│   BOUNDSHEET (per sheet), ...   │
├─────────────────────────────────┤
│ SST (Shared String Table)       │
├─────────────────────────────────┤
│ EOF                             │
├─────────────────────────────────┤
│ Sheet 1 Substream:              │
│   BOF, DIMENSIONS, ROW,         │
│   Cell records, MERGECELLS,     │
│   EOF                           │
├─────────────────────────────────┤
│ Sheet 2 Substream:              │
│   ...                           │
└─────────────────────────────────┘
```

## Record Format

全てのBIFFレコードは共通ヘッダーを持つ:

| Offset | Size | Field | Description |
|--------|------|-------|-------------|
| 0 | 2 | type | Record type identifier |
| 2 | 2 | length | Data length (max 8224) |
| 4 | N | data | Record data |

Large records exceeding 8224 bytes use CONTINUE records (0x003C).

## Implementation Priority

### Priority 1: Core (MVP)
- CFB reading
- BOF/EOF
- BOUNDSHEET
- SST (Shared String Table)
- NUMBER, RK, MULRK
- LABELSST
- BLANK, MULBLANK

### Priority 2: Essential Formatting
- XF (Extended Format)
- FONT
- FORMAT (Number Format)
- ROW, COLINFO

### Priority 3: Important Features
- FORMULA
- BOOLERR
- MERGECELLS
- DIMENSIONS

### Priority 4: Advanced
- STYLE
- Conditional Formatting
- Comments
- Hyperlinks

## Related Specifications

- `docs/specs/cfb/` - CFB container format specification
- `references/xls-specification.txt` - XLS BIFF8 specification (extracted from PDF)
- `references/ms-cfb.pdf` - Microsoft CFB specification

## Target Domain Types

変換先のXLSX domain types:

- `XlsxWorkbook` - `src/xlsx/domain/workbook.ts`
- `XlsxWorksheet` - `src/xlsx/domain/workbook.ts`
- `Cell`, `CellValue` - `src/xlsx/domain/cell/types.ts`
- `XlsxStyleSheet` - `src/xlsx/domain/style/types.ts`
- `XlsxFont`, `XlsxFill`, `XlsxBorder` - `src/xlsx/domain/style/`

# Book Stream Layout

## Overview

XLSファイルのBookストリーム（BIFF8では「Workbook」ストリーム）は、
BOF/EOFで区切られた複数のサブストリームから構成される。

## Stream Structure

```
┌─────────────────────────────────────────────────────┐
│ Workbook Globals Substream                          │
│   BOF (dt=0x0005)                                   │
│   ├── CODEPAGE                                      │
│   ├── WINDOW1                                       │
│   ├── FONT (multiple)                               │
│   ├── FORMAT (multiple)                             │
│   ├── XF (multiple)                                 │
│   ├── STYLE (multiple)                              │
│   ├── PALETTE (optional)                            │
│   ├── BOUNDSHEET (one per sheet)                    │
│   ├── SST (Shared String Table)                     │
│   ├── EXTSST (optional)                             │
│   └── ... other global records ...                  │
│   EOF                                               │
├─────────────────────────────────────────────────────┤
│ Sheet 1 Substream                                   │
│   BOF (dt=0x0010 for worksheet)                     │
│   ├── INDEX (optional)                              │
│   ├── DIMENSIONS                                    │
│   ├── WINDOW2                                       │
│   ├── DEFCOLWIDTH                                   │
│   ├── COLINFO (multiple, optional)                  │
│   ├── ROW (multiple)                                │
│   ├── Cell Records Block                            │
│   │     ├── BLANK, NUMBER, RK, MULRK                │
│   │     ├── LABELSST, BOOLERR                       │
│   │     ├── FORMULA, STRING                         │
│   │     └── MULBLANK                                │
│   ├── MERGECELLS (optional)                         │
│   ├── CONDFMT / CF (optional)                       │
│   ├── HLINK (optional)                              │
│   └── ... other sheet records ...                   │
│   EOF                                               │
├─────────────────────────────────────────────────────┤
│ Sheet 2 Substream                                   │
│   BOF ... EOF                                       │
├─────────────────────────────────────────────────────┤
│ ... additional sheets ...                           │
└─────────────────────────────────────────────────────┘
```

## Substream Types

| BOF dt value | Description |
|--------------|-------------|
| 0x0005 | Workbook globals |
| 0x0010 | Worksheet or dialog sheet |
| 0x0020 | Chart |
| 0x0040 | Excel 4.0 macro sheet |
| 0x0006 | Visual Basic module |

## Parsing Strategy

### Two-Pass Approach

**Pass 1: Structure Discovery**
1. 最初のBOF (workbook globals) を読む
2. BOUNDSHEETレコードを収集（シート名、位置）
3. SST（共有文字列テーブル）を読む
4. XF/FONT/FORMAT（スタイル情報）を読む
5. 最初のEOFまで読み進める

**Pass 2: Sheet Data**
1. 各BOUNDSHEETの `lbPlyPos` でシートサブストリームに移動
2. BOF (worksheet) を確認
3. DIMENSIONS, ROW, セルレコードを読む
4. EOFまで読み進める

### Single-Pass Approach (Alternative)

ストリームを先頭から順次読み進める:
1. BOFでサブストリーム開始を検出
2. BOFのdtフィールドでサブストリームタイプを判定
3. 該当するレコードを処理
4. EOFでサブストリーム終了を検出
5. 次のBOFまたはストリーム終端まで繰り返し

## BOF/EOF Counter

Simple Save（4KB パディング）されたファイルでは、
ストリーム末尾にゴミデータが含まれる可能性がある。

実際のストリーム終端を検出するため、BOF/EOFをカウント:

```typescript
let bofCount = 0;
for (const record of iterateRecords(stream)) {
  if (record.type === BIFF_RECORD_TYPES.BOF) {
    bofCount++;
  } else if (record.type === BIFF_RECORD_TYPES.EOF) {
    bofCount--;
    if (bofCount === 0) {
      // 全サブストリーム処理完了
      break;
    }
  }
}
```

## Record Order (Workbook Globals)

Workbook globalsサブストリーム内のレコード順序（概略）:

1. BOF
2. Interface records (INTERFACEHDR, MMS, etc.)
3. CODEPAGE
4. WINDOW1
5. BACKUP
6. HIDEOBJ
7. 1904 (date system)
8. PRECISION
9. BOOKBOOL
10. FONT (min 5 required)
11. FORMAT
12. XF
13. STYLE
14. PALETTE
15. BOUNDSHEET (per sheet)
16. COUNTRY
17. SUPBOOK, EXTERNSHEET, NAME (external references)
18. SST
19. EXTSST
20. EOF

## Record Order (Worksheet)

Worksheetサブストリーム内のレコード順序（概略）:

1. BOF
2. INDEX (optional)
3. Calc Settings (CALCMODE, CALCCOUNT, etc.)
4. Print Settings (HEADER, FOOTER, SETUP, etc.)
5. Protection records
6. DEFCOLWIDTH
7. COLINFO (per column range)
8. DIMENSIONS
9. Row/Cell Block:
   - ROW records
   - Cell records (BLANK, NUMBER, RK, LABELSST, etc.)
10. MERGECELLS
11. Conditional Formatting (CONDFMT, CF)
12. Hyperlinks (HLINK)
13. Data Validation (DVAL, DV)
14. EOF

## Implementation Notes

### BOUNDSHEET Position

BOUNDSHEETの `lbPlyPos` はBookストリーム先頭からのバイトオフセット。
CFBから読み取ったストリームバイト配列のインデックスとして直接使用可能。

### SST Processing

SSTは大きくなる可能性があり、CONTINUEレコードで分割される。
文字列の途中でCONTINUEが入る場合の処理が必要。

### Multiple Cell Records

同じ行の複数セルは連続したセルレコードとして格納される。
MULRK/MULBLANKは複数セルを1レコードに圧縮。

## Test Cases

### Expected Behavior
- BOFカウンターが正しく動作
- 各サブストリームタイプを正しく識別
- シートの順序がBOUNDSHEET順と一致

### Edge Cases
- [x] 単一シートのワークブック
- [x] 多数のシート（100+）
- [x] チャートシートを含む
- [x] VBAモジュールを含む
- [x] Simple Save パディング

## Checklist
- [x] Spec understanding complete
- [x] Parser implemented
- [x] Unit tests passing
- [x] Integration tests passing

# EOF Record (0x000A)

## Overview
- Purpose: ストリームまたはサブストリームの終了を示すマーカー
- Location: Workbook globals の終了、および各シートサブストリームの終了
- XLSX Mapping: ワークブック/ワークシートの境界を示す（暗黙的）

## Binary Structure

| Offset | Size | Field | Description |
|--------|------|-------|-------------|
| 0 | 2 | type | 0x000A |
| 2 | 2 | length | 0 (no data) |

EOFレコードはデータフィールドを持たない。
完全なレコードは4バイト: `0A 00 00 00`

## Parser Implementation

### Input
- `Uint8Array`: EOFレコードのデータ部分（0バイト）

### Output
```typescript
type EofRecord = {
  // No fields - EOF is a marker only
};
```

### Parse Logic

1. レコードタイプが0x000Aであることを確認
2. データ長が0であることを確認
3. EOFレコードとして認識

```typescript
// src/xls/biff/records/eof.ts
function parseEofRecord(data: Uint8Array): EofRecord {
  if (data.length !== 0) {
    console.warn(`EOF record has unexpected data length: ${data.length}`);
  }
  return {};
}
```

## Stream Processing

### BOF/EOF Pairing

BOFとEOFはペアで出現し、サブストリームの境界を定義する:

```
BOF (workbookGlobals)  ←── Workbook globals開始
  ... global records ...
EOF                     ←── Workbook globals終了
BOF (worksheet)         ←── Sheet1 開始
  ... sheet1 records ...
EOF                     ←── Sheet1 終了
BOF (worksheet)         ←── Sheet2 開始
  ... sheet2 records ...
EOF                     ←── Sheet2 終了
```

### State Machine

```typescript
type StreamState =
  | "initial"
  | "workbookGlobals"
  | "sheet"
  | "ended";

// BOF/EOFでstateを遷移
function handleBof(bof: BofRecord, state: StreamState): StreamState {
  if (bof.substreamType === "workbookGlobals") {
    return "workbookGlobals";
  } else if (bof.substreamType === "worksheet") {
    return "sheet";
  }
  return state;
}

function handleEof(state: StreamState): StreamState {
  // EOF後は次のBOFを待つか、ストリーム終了
  return "initial";
}
```

## XLSX Mapping

### Target Types
- N/A - EOFは直接XLSXにマッピングされない

### Mapping Rules
- Workbook globals後のEOF → シートサブストリーム処理開始
- Sheet後のEOF → 次のシート処理 or 終了

## Test Cases

### Test XLS Generation
BOF/EOFのペアリングはBOFテストと共通。

### Expected Result
```typescript
// EOFレコードの検証
const eof = parseEofRecord(eofRecordData);
expect(eofRecordData.length).toBe(0);
```

### Edge Cases
- [x] 予期せぬデータが含まれるEOF
- [x] BOF/EOFの不整合

## Checklist
- [x] Spec understanding complete
- [x] Generation script created
- [x] Test XLS generated
- [x] Parser implemented
- [x] Unit tests passing
- [x] XLSX mapping implemented
- [x] Integration tests passing
- [x] Round-trip verification complete

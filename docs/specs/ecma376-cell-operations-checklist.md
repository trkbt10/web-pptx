# ECMA-376（SpreadsheetML）セル操作チェックシート

このドキュメントは、`src/xlsx`（ECMA-376準拠ドメイン/パーサ/シリアライザ）と `src/xlsx-editor`（React UI + editor reducer）に対して、**セルに関する操作**を ECMA-376 の要素・属性単位で洗い出し、段階的に実装状況を埋めていくためのチェックシートです。

## 使い方

- 各項目は「仕様要素（ECMA-376）」「実装単位（Domain/Parser/Serializer/Editor/UI/Test）」をセットで管理します。
- `[x]` は **少なくとも Parse → 編集（または表示） → Export が破綻せず**、該当範囲のテストがある状態を指します（UIだけ・Parseだけの場合は `[ ]` のままにしてください）。
- 範囲が大きい項目は、`MVP`（最小）→`拡張`（互換性）→`完全`（Excel互換）で分解しています。

## 検証コマンド（スコープ）

- `bun run lint:xlsx-editor`
- `bun run typecheck:xlsx-editor`
- `bun run test:xlsx-editor`

## 0. 依存の末端（プリミティブ）

### 0.1 参照・レンジ・座標
- [x] A1参照の parse/format（`ST_CellRef`）: `src/xlsx/domain/cell/address.ts`
- [x] Range参照の parse/format（`ST_Ref`）: `src/xlsx/domain/cell/address.ts`
- [x] expandRange（レンジ展開）: `src/xlsx/domain/cell/address.ts`
- [x] シート名付き参照（`Sheet1!A1`, `'Sheet Name'!A1`）の parse: `src/xlsx/domain/cell/address.ts`
- [ ] 3D参照（`Sheet1:Sheet3!A1`）: 仕様整理→domain→parser→serializer

### 0.2 Worksheet 上限（仕様値）
- [x] 1048576 rows / 16384 cols の上限を UI 側の既定に採用（`XFD1048576`）: `pages/app/pages/XlsxEditorTestPage.tsx`
- [ ] dimension（`<dimension ref="...">`）と UI 表示範囲の整合（used range 既定など）

## 1. セル要素（`<c>`）の入出力

### 1.1 Cell 基本属性
ECMA-376: `c`（18.3.1.4）
- [x] `r`（必須）: parse/serialize
  - Parse: `src/xlsx/parser/cell.ts#parseCell`
  - Serialize: `src/xlsx/serializer/cell.ts#serializeCell`
- [x] `s`（style index）: parse/serialize
  - Parse: `src/xlsx/parser/cell.ts`（`styleId`）
  - Serialize: `src/xlsx/serializer/cell.ts`（`attrs.s`）
- [x] `t`（cell type）: parse/serialize（MVP）
  - Parse: `src/xlsx/parser/cell.ts#parseCellValue`
  - Serialize: `src/xlsx/serializer/cell.ts#serializeCellValue`
- [ ] `cm`/`vm`/`ph`（コメント/値メタ/phonetic 等）: 仕様整理→domain→parser→serializer

### 1.2 CellValue 型（MVP）
ECMA-376: `ST_CellType`（18.18.11）
- [x] number（`t`省略, `<v>`数値）
- [x] boolean（`t="b"`, `<v>0|1</v>`）
- [x] error（`t="e"`, `<v>#DIV/0!</v>` 等）
- [x] shared string（`t="s"`, `<v>sstIndex</v>`）: `sharedStrings.xml` と連動
- [x] inlineStr（`t="inlineStr"`, `<is><t>..</t></is>`）: Parseのみ
- [x] date（`t="d"` の ISO を Date に）: Parseのみ（※Excel互換は numFmt+数値が主）
- [ ] rich text（`<is><r>...</r></is>`）: domain→parser→serializer→UI

### 1.3 sharedStrings（SST）
ECMA-376: `sharedStrings.xml`
- [x] SST の parse: `src/xlsx/parser/shared-strings.ts`
- [x] SST の export（文字列値から収集して `sharedStrings.xml` を生成）: `src/xlsx/exporter.ts#collectSharedStrings`
- [x] string cell の serialize（SST index 参照）: `src/xlsx/serializer/cell.ts`
- [ ] inlineStr の export（状況により使い分け）: 仕様整理→serializer

## 2. 数式（`<f>`）と計算

### 2.1 公式要素の入出力
ECMA-376: `f`（18.3.1.40）
- [x] `<f>` の parse/serialize（`Formula` として保持: `expression`/`t`/`ref`/`si`/`ca`）
  - Parse: `src/xlsx/parser/cell.ts#parseFormula`, `src/xlsx/parser/cell.ts#parseCell`
  - Serialize: `src/xlsx/serializer/cell.ts#serializeFormula`, `src/xlsx/serializer/cell.ts#serializeCell`
- [ ] `t="shared"` / `t="array"` / `ref` / `si` の UI 編集・保持（Parse/Serialize は存在、Editor/UI が未整備）

### 2.2 エディタ側の式入力と表示
- [x] `=` 入力を `cell.formula.expression` に保存（`type:"normal"`）: `src/xlsx-editor/components/cell-input/parse-cell-user-input.ts`, `src/xlsx-editor/cell/mutation.ts#setCellFormula`
- [x] グリッド表示で式を評価して表示（MVP evaluator）: `src/xlsx/formula/*`, `src/xlsx-editor/components/XlsxSheetGrid.tsx`
- [ ] 依存更新（セル変更で参照先の再評価・再描画の最適化）: キャッシュ/無効化戦略
- [x] コピー/貼り付けで formula を保持（相対参照のシフト対応 / `$` absolute は維持）: `src/xlsx-editor/context/workbook/editor/reducer/clipboard-handlers.ts`
  - Test: `src/xlsx-editor/context/workbook/editor/reducer/clipboard-handlers.spec.ts`
- [x] autofill（補完）で formula を保持（相対参照のシフト対応 / `$` absolute は維持）: `src/xlsx-editor/cell/autofill.ts`
  - Reducer: `src/xlsx-editor/context/workbook/editor/reducer/drag-handlers.ts`
  - Test: `src/xlsx-editor/cell/autofill.spec.ts`, `src/xlsx-editor/context/workbook/editor/reducer/drag-handlers.spec.ts`

## 3. セル編集（Editor Action / Reducer）

### 3.1 値・数式
- [x] 単一セル更新（値）: `UPDATE_CELL` / `src/xlsx-editor/cell/mutation.ts#updateCell`
- [x] 複数セル更新（値）: `UPDATE_CELLS`
- [x] 単一セルの式設定: `SET_CELL_FORMULA` / `src/xlsx-editor/cell/mutation.ts#setCellFormula`
- [x] クリア（内容のみ）: `CLEAR_CELL_CONTENTS` / `src/xlsx-editor/cell/mutation.ts#clearCellContents`
- [x] クリア（書式のみ）: `CLEAR_CELL_FORMATS` / `src/xlsx-editor/cell/mutation.ts#clearCellFormats`

### 3.2 追加で必要なセル操作（未実装）
- [x] style の適用（範囲）: `APPLY_STYLE`
  - Mutation: `src/xlsx-editor/cell/style-mutation.ts#applyStyleToRange`
  - Reducer: `src/xlsx-editor/context/workbook/editor/reducer/formatting-handlers.ts`
  - Test: `src/xlsx-editor/cell/style-mutation.spec.ts`, `src/xlsx-editor/context/workbook/editor/reducer/formatting-handlers.spec.ts`
- [x] セル書式の編集（styles.xml を更新して styleId を生成し、範囲に適用）: `SET_SELECTION_FORMAT`
  - 対象（MVP）: font/fill/border/alignment/numFmt
  - Styles mutation: `src/xlsx/domain/style/mutation.ts`
  - Reducer: `src/xlsx-editor/context/workbook/editor/reducer/formatting-handlers.ts`
  - UI: `src/xlsx-editor/components/format-panel/XlsxCellFormatPanel.tsx`
  - Test: `src/xlsx-editor/context/workbook/editor/reducer/formatting-handlers.spec.ts`
- [x] セル書式の mixed 状態（複数セルで値が異なる場合の UI 表示）: selector→UI
  - Selector: `src/xlsx-editor/selectors/selection-format-flags.ts`
  - UI: `src/xlsx-editor/components/format-panel/XlsxCellFormatPanel.tsx`, `src/xlsx-editor/components/toolbar/XlsxWorkbookToolbar.tsx`
  - Test: `src/xlsx-editor/selectors/selection-format-flags.spec.ts`
- [x] セル結合: `MERGE_CELLS` / `UNMERGE_CELLS`
  - Mutation: `src/xlsx-editor/sheet/merge-mutation.ts`
  - Reducer: `src/xlsx-editor/context/workbook/editor/reducer/formatting-handlers.ts`
  - UI: `src/xlsx-editor/components/XlsxSheetGrid.tsx`（merged cell rendering）
  - Test: `src/xlsx-editor/sheet/merge-mutation.spec.ts`, `src/xlsx-editor/components/XlsxSheetGrid.spec.tsx`, `src/xlsx-editor/context/workbook/editor/reducer/formatting-handlers.spec.ts`

## 4. 表示（レンダリング）: 内容レイヤ / 装飾レイヤ

### 4.1 gridlines（表示用の罫線）
- [x] gridlines は可視範囲の SVG レイヤで描画（per-cell border を使わない）: `src/xlsx-editor/components/XlsxSheetGrid.tsx`
- [x] `sheetView.showGridLines` の既定（属性省略時は表示、`false` のみ非表示）: `src/xlsx-editor/components/XlsxSheetGrid.tsx`
  - Test: `src/xlsx-editor/components/XlsxSheetGrid.spec.tsx`

### 4.2 styles.xml の表示反映（MVP）
- [x] font/fill/alignment の CSS 反映: `src/xlsx-editor/selectors/cell-render-style.ts#resolveCellRenderStyle`
- [x] theme/indexed/auto color の反映（MVP: theme1.xml は未parse、既定テーマ + legacy indexed palette で解決）:
  - Resolver: `src/xlsx-editor/selectors/xlsx-color.ts`
  - Render: `src/xlsx-editor/selectors/cell-render-style.ts`
- [x] numFmt による表示（MVP: 一部フォーマットのみ）:
  - Resolver/formatter: `src/xlsx-editor/selectors/cell-display-text.ts`
  - UI: `src/xlsx-editor/components/XlsxSheetGrid.tsx`

### 4.3 border（セル罫線）: SVG オーバーレイ
- [x] styles.xml の border を解決: `src/xlsx-editor/selectors/cell-render-style.ts#resolveCellBorderDecoration`
- [x] 境界（boundary）単位で border を合成し、線分を結合して SVG に描画: `src/xlsx-editor/selectors/border-overlay.ts`, `src/xlsx-editor/components/XlsxSheetGrid.tsx`
- [x] 結合セル境界（内部境界の抑制 + merge origin の border を領域全体に適用）: `src/xlsx-editor/selectors/border-overlay.ts`
  - Test: `src/xlsx-editor/selectors/border-overlay.spec.ts`
- [ ] diagonal / outline（Excel互換）の仕様化と実装
- [ ] 競合解決（隣接セルの border 競合の Excel 互換）: 仕様化と実装

## 5. セル選択・範囲操作

- [x] セル選択（単一/範囲）: `src/xlsx-editor/context/workbook/state/selection.ts`
- [x] 行選択（ヘッダクリック）: `src/xlsx-editor/components/XlsxSheetGrid.tsx`
- [x] 列選択（ヘッダクリック）: `src/xlsx-editor/components/XlsxSheetGrid.tsx`
- [x] 全選択（左上コーナー）: `src/xlsx-editor/components/XlsxSheetGrid.tsx`
- [x] 複数範囲選択（Ctrl/Cmd+Click）: `ADD_RANGE_TO_SELECTION` を UI 接続し、selection overlay も複数範囲を描画
  - UI: `src/xlsx-editor/components/sheet-grid/cells-layer.tsx`
  - Overlay: `src/xlsx-editor/components/sheet-grid/cell-viewport.tsx`
  - Reducer: `src/xlsx-editor/context/workbook/editor/reducer/selection-handlers.ts`
  - Test: `src/xlsx-editor/components/XlsxSheetGrid.spec.tsx`
- [x] fill handle（選択範囲右下）drag による autofill（補完）: `src/xlsx-editor/components/sheet-grid/cell-viewport.tsx`
  - Action: `START_FILL_DRAG` / `PREVIEW_FILL_DRAG` / `COMMIT_FILL_DRAG`
  - Reducer: `src/xlsx-editor/context/workbook/editor/reducer/drag-handlers.ts`
  - Core: `src/xlsx-editor/cell/autofill.ts`
  - Test: `src/xlsx-editor/components/sheet-grid/cell-viewport.spec.tsx`, `src/xlsx-editor/cell/autofill.spec.ts`

## 6. セル周辺の Worksheet 要素（セル機能として扱うもの）

（ここからはセルに紐づくが、worksheet 単位の構造を持つ要素）

- [ ] dataValidation（`<dataValidations>`）: 入出力 + UI
- [ ] conditionalFormatting（`<conditionalFormatting>`）: 入出力 + UI + 表示
- [ ] hyperlinks（`<hyperlinks>` + rels）: 入出力 + UI
- [ ] comments/notes（VmlDrawing 等）: 入出力 + UI
- [ ] autoFilter / tableParts: 入出力 + UI

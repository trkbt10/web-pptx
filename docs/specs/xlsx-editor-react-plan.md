# XLSX Editor（React）実装計画 / 仕様書（ECMA-376 SpreadsheetML準拠）

## 目的

`src/xlsx-editor` に **React ベースの XLSX エディタ**を実装する。

- 参照元: `src/pptx-editor`, `src/docx-editor`, `references/react-spreadsheet`
- 正とする仕様: **OOXML / ECMA-376（SpreadsheetML）**
- 参照の扱い:
  - `references/react-spreadsheet` は **表示・スクロール・選択UIの実装**のみ参考にする
  - **式入力（Formula UI/UX・サジェスト）は参考にしない**（要件）
  - 型定義やデータモデルは参照しない（`src/xlsx` / ECMA-376 を正とする）

## 前提（既存資産）

### XLSX ドメイン / 変換
- `src/xlsx/domain/*` : Workbook / Worksheet / Cell / Style 等の ECMA-376 対応ドメイン型
- `src/xlsx/parser/*` : `.xlsx/.xlsm`（ZIP）から `XlsxWorkbook` を構築
- `src/xlsx/exporter.ts` : `XlsxWorkbook` → `.xlsx`（OPC ZIP）出力

### XLSX 編集ロジック（UI未接続）
- `src/xlsx-editor/context/workbook/editor/*` : `useReducer` 前提の editor state/action/reducer（Undo/Redo, selection, drag, clipboard, sheet/row/col, cell 更新）
- `src/xlsx-editor/cell/*`, `src/xlsx-editor/row-col/*`, `src/xlsx-editor/sheet/*` : 低レベルの query/mutation（既に unit test あり）

### 共通UI（利用・拡張対象）
- `src/office-editor-components/*` : primitives/layout/design-tokens（pptx/docx で使用済み）

### UI設計の参照（パターン）
- `src/pptx-editor/IMPLEMENTATION_GUIDE.md` : UIレイヤー分割（primitives/layout/editors）と「コンテキスト非依存」原則
- `src/docx-editor/context/document/DocumentEditorContext.tsx` : Provider + hooks + selector の実例
- `references/react-spreadsheet` : VirtualScroll / Grid / Header / Selection の実装（式入力は除外）

### テストデータ
- `fixtures/poi-test-data/test-data/spreadsheet/` を利用可能
  - **注意**: `.xls`（BIFF）も混在するため、当面は `.xlsx/.xlsm` を対象にする（`.xls` は非対象 or 変換が必要）

## チェックシート（セル操作）

セルに関する操作（ECMA-376上の要素/属性単位）の洗い出しと進捗管理は、別紙のチェックシートに集約する。

- `docs/specs/ecma376-cell-operations-checklist.md`

---

## タスク表（フェーズサマリ）

| Phase | 狙い | 主な成果物（例） | 完了条件（共通） |
| --- | --- | --- | --- |
| 0 | 共通UI基盤の先行整備 | `office-editor-components` の VirtualScroll/ContextMenu | `bun run lint:xlsx-editor` / `bun run typecheck:xlsx-editor` / `bun run test:xlsx-editor` |
| 1 | “表示できる” を成立 | `XlsxWorkbookEditorProvider` / `XlsxWorkbookEditor` / grid 描画 | 同上 |
| 2 | MVP編集体験 | 選択/編集/Undo/clipboard の UI 接続 | 同上 |
| 3 | 構造編集 | 行列・シート操作の UI 接続 | 同上 |
| 4 | styles.xml 編集 | SpreadsheetML style editor + 選択範囲への適用 | 同上 |
| 5 | 入出力統合 + fixtures テスト | round-trip integration test（fixtures） | `bun run lint:xlsx-editor` / `bun run typecheck:xlsx-editor` / （必要に応じて）`bun run test` |

## 検証コマンド（スコープ方針）

開発中は **毎回フルスコープの `bun run lint/typecheck/test` を回さない**。対象を `xlsx-editor` 周辺に絞った以下を基本とする。

- `bun run lint:xlsx-editor`
  - `src/xlsx-editor`, `src/xlsx/formula`, `src/office-editor-components` など、xlsx-editor 実装に必要な範囲のみ lint
- `bun run typecheck:xlsx-editor`
  - `tsconfig.typecheck-xlsx-editor.json` を起点に typecheck（xlsx-editor から import される `src/xlsx/*` は自動的に追従）
- `bun run test:xlsx-editor`
  - `src/xlsx-editor`, `src/xlsx/formula`, `spec/xlsx-editor` など、xlsx-editor の回帰に直結する範囲のみ実行

全体の `bun run lint` / `bun run typecheck` / `bun run test` は、変更範囲が広いタイミング（Phase 5 など）やリリース前の確認に限定する。

## 基本整理方針（ディレクトリ責務）

### 1) Excel（SpreadsheetML）固有
- `src/xlsx/` : 仕様準拠のドメイン + パース/シリアライズ/エクスポート（正）
- `src/xlsx-editor/` : XLSX 編集の **状態管理 + UI**（React）

### 2) Office共通（pptx/docx/xlsx で共有）
- `src/office-editor-components/` : 共通UIコンポーネント（primitives/layout/共通ユーティリティ）
- 「共通して登場する項目」はここへ集約する（例: ContextMenu, VirtualScroll, Selection overlay の基盤など）

### 3) “ECMA-376上で独立単位”のエディタ
ECMA-376 の要素として独立し、かつ複数エディタで再利用できる可能性があるものは、
`src/office-editor-components/` 配下に **要素単位の editor コンポーネント**として配置し、`src/xlsx-editor` から利用する。

例（SpreadsheetML中心）:
- Cell/Range のアドレス入力（NameBox）
- Number format 選択 UI（NumFmt）
- Fill / Border / Font の編集 UI（SpreadsheetML style）

---

## 想定ディレクトリ構成（案）

> 既存の `src/xlsx-editor/context/workbook/*`（reducer/state）や `cell/row-col/sheet` は維持し、UIを追加する。

### `src/xlsx-editor/`
- `index.ts`（追加）: 公開 API（Provider / UI / state re-export）
- `components/`（追加）: XLSX固有UI（grid, header, sheet tabs, formula bar）
  - `grid/` : 仮想スクロール + セル描画 + 選択ハイライト
  - `headers/` : row/col headers + resize handles
  - `tabs/` : sheet tabs
  - `cell-input/` : cell editor overlay（式サジェストは作らない）
- `context/workbook/`（既存）: editor state/action/reducer
- `selectors/`（追加）: state→view model（純関数、テストしやすく）

### `src/office-editor-components/`（追加候補）
- `scroll/VirtualScroll.tsx` など（参照: `references/react-spreadsheet`）
- `context-menu/*`（参照: `src/pptx-editor/ui/context-menu`）
- `spreadsheetml-style-editors/*`（SpreadsheetMLの独立要素 editor 群）

---

## 公開API（案）

### `src/xlsx-editor/index.ts`（追加予定）
最小の公開面（MVP）:
- React:
  - `XlsxWorkbookEditor`（UI一式: シートタブ + グリッド + 最小ツールバー）
  - `XlsxWorkbookEditorProvider`, `useXlsxWorkbookEditor`（docx と同型の提供）
- State（既存を re-export）:
  - `xlsxEditorReducer`, `createInitialState`
  - `XlsxEditorState`, `XlsxEditorAction`
- IO:
  - `parseXlsxWorkbook`（`src/xlsx/parser`）と `exportXlsx`（`src/xlsx/exporter`）を “利用例” として統合テストで接続

**設計原則**:
- UIはマウント先に依存しない（inline/panel/modal いずれでも）
- UIコンテナの背景/枠は “消費側” が決められる（pptx-editor の原則に合わせる）
- 「よしなに」動作は禁止: 必須引数不足は throw、暗黙の環境依存は禁止

---

## 仕様（MVP → 拡張）

### MVP機能（Phase 1–2）
- Workbook 表示:
  - シート切り替え（tabs）
  - グリッド表示（セル内容の描画）
  - 行/列ヘッダ表示（A,B,C… / 1,2,3…）
  - 仮想スクロール（大きいシートでも破綻しない）
- 選択:
  - 単一セル選択
  - ドラッグ範囲選択（矩形）
  - アクティブセル（カーソル）と選択範囲の分離
- 編集:
  - クリック/Enter でセル編集開始、Enter で確定、Esc でキャンセル
  - 文字列/数値/真偽/空の入力（`CellValue` へ変換）
  - **式**: `SET_CELL_FORMULA` により “文字列として保存” できること（式サジェスト等は後回し）
    - MVP: `src/xlsx/formula/*` の evaluator により **一部関数/演算のみ評価して表示**（完全互換は後続）
  - Undo/Redo（workbookレベル）
  - Copy/Cut/Paste（内部クリップボードでまず成立 → OS 連携は後続）

### 拡張機能（Phase 3+）
- 行/列:
  - 幅/高さ変更、非表示/再表示、挿入/削除
  - 行/列ヘッダ選択（列全体、行全体）
- 書式:
  - `styles.xml` に対応する最小書式編集（font/fill/border/numFmt/alignment）
  - 選択範囲への styleId 適用（APPLY_STYLE）
- マージ/解除（MERGE_CELLS / UNMERGE_CELLS）
- 入出力:
  - `.xlsx/.xlsm` 読み込み（`parseXlsxWorkbook`）
  - `.xlsx` 書き出し（`exportXlsx`）

---

## フェーズ計画（チェックリスト）

> 各フェーズ完了条件: 原則として `bun run lint:xlsx-editor` / `bun run typecheck:xlsx-editor` / `bun run test:xlsx-editor` が通ること（全体 `lint/typecheck/test` は Phase 5 やリリース前など変更範囲が広いタイミングに限定）。

### Phase 0: 土台整備（共通化の先行）

目的: xlsx-editor で必要な “共通UI基盤” を `src/office-editor-components` に用意し、以降のUI実装で重複を作らない。

- [x] `office-editor-components` に VirtualScroll（参照: `references/react-spreadsheet/src/components/scrollarea`）を移植
- [x] `office-editor-components` に ContextMenu 基盤を追加（参照: `src/pptx-editor/ui/context-menu`、xlsx/docxでも使える形）
- [x] `office-editor-components` に “グリッドの共通トークン/座標ユーティリティ” を追加（必要最小限: `grid/offsets.ts`）
- [x] xlsx-editor から参照できる public export を追加（`src/office-editor-components/index.ts` 等）

完了条件:
- [x] xlsx-editor が “共通UI基盤のみ” に依存して組める見通しが立つ
- [x] `bun run lint:xlsx-editor` / `bun run typecheck:xlsx-editor` / `bun run test:xlsx-editor` が通る

### Phase 1: XLSX グリッド表示（最小UIの成立）

目的: `XlsxWorkbook` を渡すと “表示できる” React コンポーネントを成立させる（編集は次フェーズ）。

- [x] `src/xlsx-editor` に `XlsxWorkbookEditorProvider` を追加（参照: `src/docx-editor/context/document/DocumentEditorContext.tsx`）
- [x] `src/xlsx-editor` に `XlsxWorkbookEditor`（コンテナ非依存）を追加
- [x] `pages/app/pages/XlsxEditorTestPage.tsx`（追加）で動作確認 UI を用意
- [x] シートタブ UI（表示 + 選択）
- [x] グリッド描画（仮想スクロール + セルレイヤ）
- [x] Gridlines（罫線）は **per-cell border ではなく、可視範囲に対する線レイヤ（SVG）** として描画（参照: `references/react-spreadsheet` の戦略）
- [x] 行/列ヘッダ（表示のみ）
- [x] 既存 reducer の state から “表示用 view model” を計算する selector を追加（純関数 + unit test: `selectors/sheet-layout.ts`）

完了条件:
- [ ] `.xlsx` を parse → `XlsxWorkbookEditor` に渡して “破綻なく表示” できる（ファイル入力統合は Phase 5 で実施）
- [x] `bun run lint:xlsx-editor` / `bun run typecheck:xlsx-editor` / `bun run test:xlsx-editor` が通る

### Phase 2: 選択・編集・履歴（MVP編集体験）

目的: Excel っぽい最小編集体験（選択、入力、確定、Undo）を成立させる。

- [x] セル選択（クリック、Shift+矢印で拡張、ドラッグ範囲選択）
- [x] 列選択（列ヘッダクリック）
- [x] 行選択（行ヘッダクリック）
- [x] 全選択（左上コーナークリック）
- [x] fill handle（選択範囲右下ハンドル）の表示 + drag UI（プレビュー → 確定）
- [x] autofill（補完）を reducer に接続し、COMMIT で worksheet に反映（数値/日付 series、文字列繰り返し、数式は参照シフト、style はベースをコピー）
- [x] 編集開始/終了（Enter/F2、Esc、クリック確定ポリシーは後続で明確化）
- [x] `CellValue` 変換ルール（文字列/数値/真偽/空）
- [x] “式” 入力の扱い（先頭 `=` を formula として保存）
- [x] 式の評価（MVP）
  - `src/xlsx/formula/*`（parser + evaluator）
  - grid 表示は評価結果を表示（編集欄は `=...` を表示）
- [x] 式の評価（関数群の拡充）
  - `references/react-spreadsheet/src/modules/formula/functions/*` の **実装**を `src/xlsx/formula/functions/*` に導入（型/モデルは `src/xlsx` を正として適合）
  - `src/xlsx/formula/functionRegistry.ts` で関数を一括登録し、`src/xlsx/formula/evaluator.ts` から利用
  - `{...;...}` の **配列リテラル**を parser/evaluator に追加（`VLOOKUP`, `OFFSET` 等のテストに利用）
  - lazy 関数（`IF`, `IFERROR`, `INDIRECT`, `OFFSET` など）の評価経路を整備
  - unit test（`src/xlsx/formula/evaluator.spec.ts`）に代表例を追加して回帰を防止
  - financial 関数は関数ごとに unit test を追加（`src/xlsx/formula/functions/financial/*.spec.ts`）し、samples の期待値もテスト結果と一致させる
- [x] Undo/Redo ボタン + ショートカット（Ctrl/Cmd+Z, Shift+Ctrl/Cmd+Z）
- [x] 内部 Copy/Cut/Paste（選択範囲 → clipboard state → paste）
- [x] 最小の Formula/Value bar（ツールバー）を追加（アクティブセルの値/式編集）

完了条件:
- [x] 主要操作が reducer action に落ち、state が一貫して更新される
- [x] 代表的 UI 操作の integration test（React Testing Library）を追加
- [x] `bun run lint:xlsx-editor` / `bun run typecheck:xlsx-editor` / `bun run test:xlsx-editor` が通る

### Phase 3: 行/列・シート操作（表計算の骨格）

目的: 行/列やシートの構造編集を UI に接続し、実データでの編集を可能にする。

- [x] 列幅/行高の変更 UI（ドラッグ、数値入力の両方）
- [x] 行/列の挿入/削除（右クリック or ヘッダメニュー）
- [x] 行/列の非表示/再表示（ヘッダメニュー + 隣接列/行の unhide）
- [x] シート追加/削除/複製/リネーム/並び替え（Move left/right）
- [x] 選択範囲への styleId 適用（`APPLY_STYLE`）の reducer 実装 + 最小UI（Toolbar の `styleId` 入力）
- [x] マージ/解除（`MERGE_CELLS` / `UNMERGE_CELLS`）の reducer 実装 + merged cell 表示（MVP）
- [x] スクロール位置/選択の “シート切替時の保持ポリシー” を仕様化
  - `SELECT_SHEET` で selection/drag/editing はリセット（reducer 仕様）
  - スクロールは sheet の grid が unmount/mount されるためリセット（現行 UI）

完了条件:
- [ ] `fixtures/poi-test-data/test-data/spreadsheet/*.xlsx` から複数ケースを選び、破綻しない

### Phase 4: 書式（styles.xml）編集（SpreadsheetMLの要点）

目的: ECMA-376 の styles（cellXfs/fonts/fills/borders/numFmts）を UI から編集できるようにする。

- [x] セル書式編集パネル（フォント/塗り/罫線/配置/数値書式の最小）を追加し、選択範囲に適用できる
  - `src/xlsx-editor/components/format-panel/XlsxCellFormatPanel.tsx`
  - reducer action: `SET_SELECTION_FORMAT`
- [x] “選択範囲の現在書式” 解決（複数セルの mixed 状態も扱う、巨大範囲でも O(n^2) で走査しない）
- [ ] `office-editor-components` に SpreadsheetML style editor 群を追加
  - [ ] Font editor（`XlsxFont`）
  - [ ] Fill editor（`XlsxFill`）
  - [ ] Border editor（`XlsxBorder`）
  - [ ] Alignment editor（`XlsxAlignment`）
  - [ ] Number format editor（`XlsxNumberFormat`）
- [ ] style の追加/参照（styles コレクションの更新と `StyleId` の適用）
- [ ] 書式 UI（Toolbar + Inspector 的なパネル）を追加（pptx/docx の layout/primitives を利用）

完了条件:
- [ ] 書式変更が `exportXlsx` の出力に反映され、再読み込みで保持される（最小ケース）

### Phase 2/3: styles.xml の表示反映（レンダリング）

編集 UI（Phase 4）より先に、既存ファイルに含まれる styles.xml を **描画に反映**できる状態を最低ラインとして維持する。

- [x] Cell style の解決（cell/row/col の styleId を解決し、cellXfs(+cellStyleXfs) を適用）
- [x] 反映対象（MVP）
  - [x] Font（name/size/bold/italic/underline/strike/color ※rgb）
  - [x] Fill（pattern solid の fgColor ※rgb）
  - [x] Alignment（horizontal/vertical/wrapText）
  - [x] Border（left/right/top/bottom の基本スタイル ※rgb）
  - [ ] Theme/indexed/auto color（後続）

### Phase 5: 入出力統合・フィクスチャ駆動テスト

目的: 実ファイルを入出力し、回帰防止のためのテスト基盤を固める。

- [x] `.xlsx/.xlsm` ロード（JSZip + `parseXlsxWorkbook`）の共通ユーティリティを `scripts/lib` か `src/files` に追加（重複禁止: `src/files/ooxml-zip.ts`）
- [x] “ロード → 編集 → export → 再 parse” の round-trip integration test を `spec/` 配下に追加（`spec/xlsx-editor/xlsx-editor-roundtrip.spec.ts`）
- [x] fixtures の採用リストを明示（重い/壊れている/非対象 `.xls` を除外）
  - 採用: `fixtures/poi-test-data/test-data/spreadsheet/1_NoIden.xlsx`
- [ ] パフォーマンスの最小ガード（巨大シートでの描画が O(表示セル数) に近いこと）

完了条件:
- [ ] 代表 fixtures で round-trip が通り、最小編集が保持される

---

## テスト戦略（配置ルール準拠）

- ユニットテスト: 実装と同階層に `[name].spec.ts`（既存方針に従う）
  - selector / view model / mutation / reducer handler はユニット中心
- 統合テスト: `spec/` 配下に `[purpose].spec.ts`
  - fixtures を読み、UI も含めた round-trip を確認

---

## 開発時の検証コマンド（スコープ制御）

このリポジトリは全体 `lint/typecheck/test` の対象範囲が広いため、XLSX Editor 開発中は **変更範囲に限定したコマンド**で反復を回す。

日常（XLSX Editor 変更時）:
- 最小 lint（warning も 0 に固定）: `bun x eslint src/xlsx-editor src/xlsx --max-warnings 0`
- `bun run lint:xlsx-editor`
- `bun run typecheck:xlsx-editor`
- `bun run test:xlsx-editor`

スコープの注意:
- `bun x eslint ... --max-warnings 0` は `src/xlsx-editor` と `src/xlsx` のみを厳格に見る（`--quiet` で warning を隠さない）
- `lint:xlsx-editor` は UI 動作確認用に `pages/app/*` の最小範囲も含める（XLSX Editor の導線・テストページ）
- `typecheck:xlsx-editor` は `tsc -p tsconfig.typecheck-xlsx-editor.json` を使い、`pages/` は対象外（`@lib/*` 解決は Vite 側に寄せているため）
- `test:xlsx-editor` は XLSX Editor 関連ディレクトリ（および必要な共通UI）に限定して実行する

統合前（大きなマージ前/リリース前）:
- `bun run lint`
- `bun run typecheck`
- `bun run test`

---

## リスク / 注意点（明示）

- `fixtures/poi-test-data/test-data/spreadsheet` は `.xls` を含むため、**XLS (BIFF) を誤って対象にすると破綻**する（非対象を明示する）
- “式の評価” は別問題：SpreadsheetML の計算エンジンを実装しない限り、**表示値と式結果の整合**は保証できない（MVPでは “式文字列の保持” のみに限定）
- styles は参照構造（id参照）なので、UI操作が “新規style追加” を乱発すると肥大化する：ポリシー（既存再利用/差分生成）を仕様化してから実装する

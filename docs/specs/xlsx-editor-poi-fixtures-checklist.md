# Fixtures（poi-test-data）検証チェックリスト（XLSX Editor）

目的: `fixtures/poi-test-data/test-data/spreadsheet/` の実ファイルを回帰入力として、**取り込み（parse）→式評価→装飾/配置/文字フォーマット**の「壊れていない」を積み上げ式で確認する。

## 対象と優先順

- 対象: **`.xlsx` / `.xlsm`**
- 非対象（別系統）:
  - `.xls`（BIFF）
  - `.xlsb`（binary workbook）
- 優先: **“試験の目的が名前に出ている” ファイル名**を先に追加する
  - 例: `formula-eval.xlsx`, `shared_formulas.xlsx`, `50784-font_theme_colours.xlsx`, `50846-border_colours.xlsx`

## 追加手順（1ファイル追加ごとのテンプレ）

- [ ] 1) 対象ファイルを選ぶ（例: `50784-font_theme_colours.xlsx`）
- [ ] 2) `spec/xlsx-editor/poi-spreadsheet-fixtures.spec.ts` に `it("...", async () => { ... })` を追加する
  - [ ] `parseXlsxWorkbook` で parse できること（例外が出ない）
  - [ ] テスト対象 sheet を決める（`sheetIndex` または `sheet.name` で固定）
- [ ] 3) テスト対象のセル/範囲を決める（A1/B3 など）
  - [ ] 目的に直結する **最小のセル数**に絞る（壊れた時に原因追跡しやすい）
  - [ ] 解析が必要なら `bun -e '...'` のワンライナーで探索する
    - [ ] 一時ファイルを作る場合は `[name].tmp.ts` を使い、確認後に削除する
- [ ] 4) 検証観点を選んで assert を追加する（以下から複数）
  - [ ] **式評価**:
    - [ ] `createFormulaEvaluator(workbook)` → `evaluateCell(sheetIndex, address)` が `cell.value`（cached 結果）と一致
    - [ ] `cell.formula.expression` が空でない（shared formula 展開漏れの検知）
    - [ ] 可能なら `cell.formula.expression` の文字列も一致（「別の式になっている」を早期検知）
  - [ ] **装飾/配置/文字**:
    - [ ] `resolveCellRenderStyle({ styles, sheet, address, cell })` の CSS が期待どおり
    - [ ] 例: `color` / `backgroundColor` / `fontWeight` / `fontStyle` / `textDecorationLine`
    - [ ] 例: `justifyContent` / `alignItems` / `whiteSpace`（wrap）
  - [ ] **罫線（border）**:
    - [ ] `createSheetLayout(...)` を作って `buildBorderOverlayLines(...)` を呼ぶ
    - [ ] `rowRange/colRange` は狭く固定し、`stroke` 色や線数などを検証する
- [ ] 5) 検証結果をこのファイル下部の「カバレッジ表」に追記する

## 実行コマンド（スコープ付き）

日常（fixtures 検証のみ）:
- [ ] `bun x vitest --run spec/xlsx-editor/poi-spreadsheet-fixtures.spec.ts`

統合（xlsx-editor 関連の回帰をまとめて）:
- [ ] `bun run test:xlsx-editor`

最小 lint/typecheck（warning を残さない）:
- [ ] 日常（xlsx-editor/xlsx 周辺だけ）: `bun run lint:xlsx-editor:scope`
- [ ] 統合（xlsx-editor 周辺一式）: `bun run lint:xlsx-editor`
- [ ] `bun run typecheck:xlsx-editor`

## 注意（巨大テキスト系）

- `poc-shared-strings.xlsx` は共有文字列が極端に大きく、**そのまま DOM に出すとブラウザが固まりやすい**。
  - ECMA-376 の内容（セル値）を改変しないため、**文字列は切り詰めず保持**する。
  - 表示は「DOM に巨大なテキストノードを挿入しない」方針で、必要に応じて **canvas 描画でセル内にクリップして表示**する。

## カバレッジ表（追加したら更新）

| Fixture | 主目的（ファイル名） | 検証していること（要点） |
| --- | --- | --- |
| `formula-eval.xlsx` | formula eval | `SUM` の評価結果が cached 値と一致 |
| `shared_formulas.xlsx` | shared formulas | shared formula 展開（空式にならない）+ 参照シフト評価 |
| `50784-font_theme_colours.xlsx` | font theme colours | theme/rgb のフォント色解決（CSS `color`） |
| `50786-indexed_colours.xlsx` | indexed colours | indexed fill + alignment/wrap（CSS） |
| `50846-border_colours.xlsx` | border colours | border overlay の `stroke` 色（SVG レイヤ） |
| `decimal-format.xlsx` | decimal format | numFmt 解決（`formatCode`）+ 表示丸め（`1.005`→`1.01`） |
| `NewlineInFormulas.xlsx` | newline in formulas | 改行を含む式の parse/eval（`SUM(\\r\\n1,2\\r\\n)`） |
| `InlineStrings.xlsx` | inline strings | `t="inlineStr"` のセル値取り込み + `$` 絶対参照を含む式（例: `A4-A$2`）評価が cached 値と一致 |
| `VLookupFullColumn.xlsx` | VLOOKUP full column | 全列参照 `$D:$E` の range 解決 + `VLOOKUP` が cached 値と一致 |
| `Booleans.xlsx` | booleans | `TRUE()`/`FALSE()` の評価 + cached 値（boolean）一致 |
| `MatrixFormulaEvalTestData.xlsx` | matrix formulas | array/matrix（`TRANSPOSE`/`MINVERSE`/`MMULT`/行列加算）評価 + cached 値一致 |
| `FormulaEvalTestData_Copy.xlsx` | formula eval dataset | `ABS`/`ACOS`/`AND`/`ASIN` などの式評価が cached 値と一致（+ `textRotation=255` を vertical writing mode として CSS へ反映） |
| `54288.xlsx` | missing cell refs | 非標準（`<c r>` 省略）を **compatibility option 明示時のみ** pos fallback で解釈して parse 継続できる |
| `54084 - Greek - beyond BMP.xlsx` | unicode beyond BMP | sharedStrings の非BMP文字（サロゲート）取り込み |
| `poc-shared-strings.xlsx` | large shared strings | 共有文字列（巨大テキスト）の取り込み（長さ > 1,000,000） |
| `noSharedStringTable.xlsx` | missing sharedStrings.xml | sharedStrings が無い workbook の parse |
| `FillWithoutColor.xlsx` | fills w/ missing color | fill（pattern/fg/bg）の色解決（CSS `backgroundColor`）+ alignment（`indent`）を CSS（`--xlsx-cell-indent-start`）へ反映できる |
| `bug66675.xlsx` | alignment readingOrder | alignment（`readingOrder`）を parse し、UI 側で CSS `direction`（`ltr`/`rtl`）へ反映できる |
| `45544.xlsx` | percent number formats | custom numFmt（例: `0.0%`）を解釈し、表示が `%%` のように重複せず（`0.1`→`10.0%`）、`%` 個数ぶんスケール（`0%%` は 100^2 倍）できる |
| `bug66215.xlsx` | percent (built-in + general numeric align) | built-in numFmtId=9（`0%`）を解釈し、表示が `%%` にならない（`0.1`→`10%`）。`horizontal="general"`（または未指定）では数値が右寄せになる |
| `styles.xlsx` | basic styles | font（bold/italic/underline）+ alignment（left/center/right）+ theme fill を `resolveCellRenderStyle` で CSS に反映できる |
| `ShrinkToFit.xlsx` | shrink to fit | alignment（`shrinkToFit`）を parse し、UI 側で shrink-to-fit の表示ヒント（`whiteSpace=nowrap`/`overflow=hidden`）へ反映できる（horizontal=general の数値セルは右寄せ） |
| `picture.xlsx` | text rotation | alignment（`textRotation=90`）を parse し、UI 側で CSS rotate（`transform: rotate(-90deg)`）へ反映できる |
| `49273.xlsx` | text rotation (angle) | alignment（`textRotation=31`）を parse し、UI 側で CSS rotate（`transform: rotate(-31deg)`）へ反映できる |
| `style-alternate-content.xlsx` | alternate content + borders | AlternateContent を含む styles/worksheet を parse し、mergeCells + 罫線（thin）+ フォント（サイズ差分）を解決して UI selector に反映できる |
| `1_NoIden.xlsx` | cols + merges | cols（幅/bestFit）+ mergeCells の parse |
| `WidthsAndHeights.xlsx` | row/col dimensions | row（height/hidden）+ col（width/hidden）を parse し、sheet layout（pixel）へ反映できる |
| `56822-Countifs.xlsx` | COUNTIFS | `COUNTIFS` の式評価が cached 値と一致 |
| `55906-MultiSheetRefs.xlsx` | 3D references | `Sheet1:Sheet3!`（3D参照/3Dレンジ）の式評価が cached 値と一致 |
| `46535.xlsx` | defined names | named range（`definedName`）を参照する式（例: `VLOOKUP(...,AirportCode,...)`）の評価が cached 値と一致 |
| `47737.xlsx` | sheetView panes | sheetView の frozen pane（`ySplit/topLeftCell/state`）+ selection の parse |
| `47813.xlsx` | sheetView panes | sheetView の frozen pane（`ySplit/topLeftCell/state`）+ selection の parse |
| `50755_workday_formula_example.xlsx` | WORKDAY | `WORKDAY` の式評価が cached 値と一致 |
| `evaluate_formula_with_structured_table_references.xlsx` | structured refs | structured reference（`Table1[[A]:[B]]`）の式評価が cached 値と一致 |
| `50867_with_table.xlsx` | with table | table 定義（`xl/tables/table1.xml`）の parse（name/ref/columns） |
| `WithTable.xlsx` | tableStyleInfo (no tableStyles) | tableStyleInfo（`name/showRowStripes` 等）を parse でき、styles.xml に `tableStyles/dxfs` が無い場合でも table-style DXF 解決が no-op で落ちない |
| `simple-table-named-range.xlsx` | named range + table | definedName が structured reference（例: `SUM(Table1[c])`）を含む場合でも評価でき、セル側でその名前（例: `total`）を参照した式が cached 値と一致する |
| `SingleCellTable.xlsx` | table (no headers) | headerRowCount=0 のテーブルでも structured reference（例: `SUM(Table3[Column1])`）が評価できる |
| `table-sample.xlsx` | table totals + structured refs | totalsRowCount を parse し、`[#This Row]`/`[#Totals]` を含む structured reference（例: `Tabelle1[[#Totals],[Field 4 ]]`）の式評価が cached 値と一致する |
| `ExcelTables.xlsx` | tables + formulas | table 定義（name/ref/columns）を parse し、テーブル範囲内の `INT(.../10)` が cached 値と一致する |
| `TablesWithDifferentHeaders.xlsx` | tables (header names) | 複数 sheet の table 定義を parse し、列名（数値/小数を含む文字列）が壊れない（例: `"12"`, `"12.34"`） |
| `SheetTabColors.xlsx` | sheet tab colors | `sheetPr/tabColor`（indexed/rgb）を parse し、UI 側で CSS 色へ変換できる |
| `customIndexedColors.xlsx` | custom indexed palette | styles.xml の `colors/indexedColors` を parse し、indexed 色解決（fill/font）が既定パレットではなく workbook パレットに従う |
| `Themes.xlsx` | theme colors | styles.xml の `color theme="n"`（n=0..11）を解決し、フォント色が期待のテーマ色（dk1..folHlink）になる |
| `Themes2.xlsx` | theme + conditional formatting | conditionalFormatting の dxfs が theme bgColor + rgb fontColor を持つ場合に、CSS（`backgroundColor`/`color`）へ反映できる |
| `dataValidationTableRange.xlsx` | data validation (named/table ranges) | worksheet の dataValidations を parse し、`sqref` + `formula1`（definedName参照）が壊れない（例: `highlight_list`） |
| `tableStyle.xlsx` | table style | tableStyleInfo + styles.xml の tableStyles（element→dxfId）を parse し、テーブルスタイルの DXF（例: firstHeaderCell の赤文字）をレンダリングへ反映できる |
| `59746_NoRowNums.xlsx` | NoRowNums | 非標準（`<row r>`/`<c r>` 欠落 + prefix 付き XML）を **compatibility option 明示時のみ** positional fallback で解釈して parse 継続できる |
| `61060-conditional-number-formatting.xlsx` | conditional number formatting | conditionalFormatting（cellIs）+ styles.xml の dxfs（fill/numFmt）を解決して適用できる |
| `55406_Conditional_formatting_sample.xlsx` | Conditional formatting sample | conditionalFormatting（expression）を origin 付きで評価（`ISEVEN(ROW())`）し、dxfs の fill を適用できる |
| `50795.xlsx` | comments | comments（`xl/comments*.xml`）を取り込み、author + rich text をセル（`ref`）へ紐付けできる |
| `sharedhyperlink.xlsx` | shared hyperlink | hyperlinks（`<hyperlinks>` + `r:id`）を parse し、sheet rels の hyperlink Relationship から target URL を解決できる |
| `conditional_formatting_cell_is.xlsx` | conditional formatting cellIs | conditionalFormatting（cellIs）で参照セル（例: `B3 = B2`）を評価し、dxfs の fill を適用できる |
| `conditional_formatting_multiple_ranges.xlsx` | conditional formatting multiple ranges | sqref が複数レンジ（スペース区切り）でも parse でき、各レンジに対する適用判定が破綻しない |
| `conditional_formatting_with_formula_on_second_sheet.xlsx` | conditional formatting numeric expr | conditionalFormatting（expression）の評価で数値の真偽（0=false, 非0=true）を扱える |
| `test_conditional_formatting.xlsx` | conditional formatting (containsText) | conditionalFormatting（`type="containsText"` など expression 以外）でも `<formula>` を評価し、dxfs の fill（例: `FFFFEB9C`→`#FFEB9C`）を適用できる |
| `ConditionalFormattingSamples.xlsx` | conditional formatting (containsText/cellIs) | conditionalFormatting（containsText/cellIs）で `<formula>` を評価し、dxfs の fill（fgColor 優先）+ font color を CSS（`backgroundColor`/`color`）へ反映できる |
| `NewStyleConditionalFormattings.xlsx` | conditional formatting (mixed types) | iconSet/dataBar/colorScale を含むシートでも、`dxfId` を持つ expression ルールを評価して dxfs の fill（例: `FF7030A0`→`#7030A0`）を適用できる |
| `NumberFormatTests.xlsx` | number formats via TEXT() | `TEXT(Cx, Bx)` の式評価で Excel 形式（ゼロ埋め/通貨/桁区切り/小数の可変）を生成し、cached 文字列と一致する（例: `000.00`→`012.30`, `#,##0.00`→`314,159.00`） |
| `WithConditionalFormatting.xlsx` | conditional formatting (dxf font) | conditionalFormatting の dxfs で `font`（color/name/bold/italic）を parse して CSS（`color`/`fontFamily`/`fontWeight`/`fontStyle`）へ反映できる |
| `DateFormatTests.xlsx` | date formats via TEXT() | `date1904` を解釈しつつ `TEXT()` の日付/時刻/曜日/月名/quoted literal（例: `d "days" h`）を評価し、cached 文字列と一致する |
| `DateFormatNumberTests.xlsx` | fractional seconds rounding | `TEXT()` の `...ss.000/.00/.0/ss` で小数秒の丸め（ms→桁）と秒丸めが Excel と一致する（`37.638` → `.64` / `.6` / `38`） |
| `ElapsedFormatTests.xlsx` | elapsed time tokens | `TEXT()` の `[h]`/`[m]`/`[s]`（elapsed）を評価でき、quoted/escaped literal を含む formatCode でも cached 文字列と一致する |
| `xlookup.xlsx` | XLOOKUP / XMATCH | `_xlfn.XLOOKUP`/`_xlfn.XMATCH` の parse（`_`/`.` を含む関数名）+ `match_mode`/`search_mode`（binary search 2/-2 を含む）の評価が cached 値と一致する |
| `FormatChoiceTests.xlsx` | conditional formatCode | `TEXT()` の formatCode が条件付き（例: `[<10]#" Wow"`）でも、条件の評価（false→General 相当へフォールバック）と affix 抽出が壊れず cached 文字列と一致する（例: `2 Wow`, `10`, `11 Big`） |
| `FormatConditionTests.xlsx` | conditional formatCode | `TEXT()` の formatCode が複数条件/複数セクションでも、条件選択（最初に成立するセクション優先）と数値整形が cached 文字列と一致する |
| `TextFormatTests.xlsx` | TEXT (text section) | `TEXT()` が文字列/TRUE/FALSE を受け取り、formatCode の text section（`;;;` + `@` 置換）を評価して cached 文字列と一致する（例: `@jello@`, `-TRUE-TRUE-`） |
| `GeneralFormatTests.xlsx` | General format | `TEXT()` の `General` が JS の `toString()` 依存にならず、指数表記の閾値（`1E+11`/`1E-10`）と小数の展開（`0.000000001`）が cached 文字列と一致する |
| `NumberFormatApproxTests.xlsx` | scientific format (approx) | `TEXT()` の科学表記（`e-`/`e+`/`E-`）を含む formatCode で、mantissa/exponent のスケール・`?` による空白パディング・区切りの literal を保持しつつ cached 文字列と一致する（例: `|12.3457|e|4|`, `|1e-5|`） |
| `FormatKM.xlsx` | K/M scaling numFmt | cellXfs の numFmt が条件付き（`[>999999]...;[>999]...;...`）かつ `,` によるスケール（`K/M`）を含む場合に、`formatCellValueForDisplay` が期待値（例: `1K`, `1.021M`）と一致する |
| `Formatting.xlsx` | formats (date/number) | styles.xml の numFmt（built-in + custom）を解決し、日付（serial=39045→`2006-11-24`）や数値（`0.000`/通貨 `\"£\"#,##0.00`）の表示テキストが期待どおりになる |
| `StructuredRefs-lots-with-lookups.xlsx` | structured refs + lookups | `[#All]` の structured reference がレンジとして解決でき、`&` 連結・`ISNA`・`VLOOKUP` を含む式が cached 値と一致する |

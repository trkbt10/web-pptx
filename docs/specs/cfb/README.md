# CFB (Compound File Binary) specs / plans

Excel のマクロ有効ブック（`.xlsm`）は ZIP（OOXML）であり、マクロ本体は通常 `xl/vbaProject.bin` として格納されます。`vbaProject.bin` は OLE Structured Storage / Compound File Binary（CFB）形式です。

このフォルダでは、`references/ms-cfb.pdf`（[MS-CFB]）を根拠に、CFB を **読み取り専用**で扱うための「パーサ」と「ランナー（= ディレクトリ階層解決・ストリーム読取の実行層）」の実装計画を分割して記述します。

- 00: スコープ・非目標: `docs/specs/cfb/00-scope.md`
- 10: フォーマット要点（MS-CFB 抜粋要約）: `docs/specs/cfb/10-format-summary.md`
- 20: パーサ設計（低レベル）: `docs/specs/cfb/20-parser-design.md`
- 30: ランナー設計（高レベル API）: `docs/specs/cfb/30-runner-design.md`
- 40: バリデーション/安全性方針: `docs/specs/cfb/40-validation.md`
- 50: テスト計画: `docs/specs/cfb/50-test-plan.md`
- 60: `.xlsm` 統合計画（`vbaProject.bin` 取り扱い）: `docs/specs/cfb/60-xlsm-integration.md`


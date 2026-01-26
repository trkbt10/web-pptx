# `.xlsm` 統合計画（`vbaProject.bin` の扱い）

## `.xlsm` と `vbaProject.bin`

- `.xlsm` は ZIP（OOXML）。
- マクロは通常 `xl/vbaProject.bin` に格納される。
  - このファイルが CFB（[MS-CFB]）なので、CFB パーサ/ランナーで中身（Storage/Stream）を辿れる。

## 読み込み側（案）

- ZIP を読み込み、`xl/vbaProject.bin` が存在するか確認。
- 存在する場合:
  - バイナリを `Uint8Array` として保持（“維持”のため）。
  - 必要に応じて `openCfb(vbaProjectBytes)` で CFB として解析し、
    - 「マクロあり」の判定
    - 主要ストリームの存在確認（例: `/VBA/dir` などの *パス確認*）
    - デバッグ用途のツリー表示
    を行う。

## 書き出し側（案）

- 既存の `.xlsx` 書き出しロジックに対し、入力が `.xlsm` で `vbaProject.bin` を保持している場合:
  - `xl/vbaProject.bin` を **同一バイト列で** ZIP に再格納する（最小要件）。
  - 併せて `[Content_Types].xml` や `.rels` のマクロ関連エントリが欠落しないようにする（要調査/実装）。

## 重要な確認点（未決）

- 既存の exporter が「未知パート」を落とさない設計か（落とす場合、マクロ保持ができない）。
- UI として「マクロを維持する/削除する」をどこで選ばせるか（暗黙で無視・暗黙で実行は避ける）。


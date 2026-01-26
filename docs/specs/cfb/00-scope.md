# スコープ（xlsx マクロ対応に向けた CFB）

## 背景

- `.xlsm` は OOXML（ZIP）で、VBA マクロは一般に `xl/vbaProject.bin` に格納される。
- `vbaProject.bin` は CFB（[MS-CFB]）であり、CFB パースができると「マクロ有無の判定」「内部ストリーム抽出」「編集時の維持（パススルー）」の基盤になる。

## 目的（この計画で実現したいこと）

- **CFB の読み取り専用パーサ**を実装し、ヘッダ/FAT/DIFAT/MiniFAT/Directory を解釈できるようにする。
- **CFB ランナー**を実装し、ディレクトリ階層（Storage/Stream）を辿って任意ストリームを安全に読み出せるようにする。
- `.xlsm`（ZIP）から `xl/vbaProject.bin` を取り出し、CFB として解析・保持できるようにする（書き戻しは「バイト列の維持」が最小目標）。

## 非目標（明示）

- VBA を **実行**する（VBA VM / Excel オブジェクトモデル互換の実装）は、この計画範囲外。
- CFB の **書き込み**（FAT 再配置、ディレクトリ更新、ストリーム更新）は範囲外（まず読み取り専用）。
- `vbaProject.bin` の中身（VBA プロジェクト固有のストリーム構造、圧縮等）解釈は、この計画では「次段階」。まずは CFB の一般機構でストリーム抽出できるところまで。

## 用語

- **CFB**: Compound File Binary。Storage/Stream を 1 ファイル内に持つ擬似ファイルシステム。
- **Runner**: この文書では「パースした CFB 構造を使って、パス解決・ストリーム読取など“実行”を担当する層」を指す（VBA 実行ではない）。

## 参照

- `references/ms-cfb.pdf`（[MS-CFB] - Compound File Binary File Format）


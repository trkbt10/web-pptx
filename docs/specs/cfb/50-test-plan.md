# テスト計画（CFB パーサ/ランナー）

## テスト粒度

- **ユニットテスト**: `src/cfb/**.spec.ts`（CFB モジュールに密着）
- **統合テスト**: `.xlsm` から `xl/vbaProject.bin` を抜き出して CFB として読める（必要なら `spec/` 側）

## 推奨 fixture

- 小さめの `.xlsm` を 1 つ用意し、`xl/vbaProject.bin` を抽出した生バイナリを fixture 化する。
  - 目的: 実データで directory 走査・mini stream・複数 stream 読取が成立することを固定する。

## ユニットテスト項目（例）

- header
  - signature/version/sector size 判定
  - 不正 signature は throw
- FAT/DIFAT
  - DIFAT 109 エントリのみで完結するケース
  - DIFAT セクタを辿るケース（DIFAT chain）
  - FAT chain 循環検出
- Directory
  - root entry の存在
  - storage の child tree 走査で期待する数の子が列挙できる
- Stream 読取
  - 通常セクタの stream が読める
  - mini stream 側の stream が読める（cutoff 未満）
- strict 検証
  - stream size とチェーン長の矛盾検出


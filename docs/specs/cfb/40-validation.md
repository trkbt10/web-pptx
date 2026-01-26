# バリデーション/安全性方針

## 破損耐性（最低限）

CFB は「内部に複数のチェーン」を持つため、破損時に無限ループ/過剰確保になりやすい。以下は必須:

- FAT / miniFAT / DIFAT / Directory いずれのチェーンでも循環検出する（visited）。
- 予約値（`FREESECT` など）が「次セクタ」として出現したら throw。
- セクタ番号が `MAXREGSECT` を超えたら throw。
- ファイルオフセット計算後に範囲外 slice になる場合は throw。

## strict モードで追加したい検証

- header の MUST 条件
  - signature / byte order / mini sector shift / cutoff size（0x1000）など
- `Number of FAT Sectors` と DIFAT 収集数の整合
- stream size と必要セクタ数（`ceil(size / sectorSize)`）の整合
- Directory Entry の MUST 条件（unused entry は 0 埋め + sibling/child は NOSTREAM など）

## セキュリティ観点（マクロ）

- `vbaProject.bin` の解析は「データの読取」に留め、VBA を実行しない。
- UI/ドキュメント上でも「マクロを維持する/削除する/無視する」の扱いを明確にし、暗黙実行はしない。


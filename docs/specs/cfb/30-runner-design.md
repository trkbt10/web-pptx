# CFB ランナー設計（階層解決・ストリーム読取）

## ランナーの位置づけ

パーサが構築した `header/FAT/MiniFAT/Directory` を使って、

- Storage/Stream の「階層」を解決し
- 任意の stream を **安全に**読み出す

ための API 層を「ランナー」と呼ぶ。

## 目標 API（案）

- `list(path?: string[]): { name: string; type: "storage" | "stream" }[]`
- `getEntry(path: string[]): CfbDirectoryEntry`（見つからなければ throw）
- `readStream(path: string[]): Uint8Array`
- `readStreamText(path: string[], enc: "utf-8" | "utf-16le"): string`（VBA 専用ではなく汎用）

## パス解決の前提（Directory の木構造）

- ある storage の「子」は `Child ID` が指す **赤黒木の根**として表現される。
- 各 Directory Entry には `Left Sibling ID` / `Right Sibling ID` があり、二分探索木として辿れる。

### 比較関数（同名判定/探索に必要）

[MS-CFB] の並び順は概ね以下:

1. `Directory Entry Name Length`（短い方が小さい）
2. 同じ長さなら UTF-16 code point（を 1 つずつ）比較
3. 比較前に「Unicode Default Case Conversion Algorithm（simple case conversion）」で大文字化

実装では少なくとも以下を満たす:

- ルート配下の子探索・同名判定が、実データ（`vbaProject.bin`）で破綻しない。
- locale 依存を避け、`toUpperCase()` のような “実装依存” を使う場合は影響範囲をテストで固定する。

## 実装方式（2案）

### A案: 木を走査してインデックス化

- storage ごとに `childId` から全ノードを in-order 走査し、`Map<normalizedName, streamId>` を作る。
- パス解決は `O(depth)` で、各階層の子探索は `O(1)`。
- 破損ファイルに対しては、木の循環/範囲外 ID を検出して throw。

### B案: 赤黒木を二分探索で辿る（インデックス無し）

- `findChild(storageId, name)` で比較関数に基づき left/right を辿る。
- メモリは少ないが、比較関数の実装精度に依存。

最初は A案（走査→インデックス化）で「確実に動く」を優先し、必要があれば B案へ最適化する。

## Stream 読取（mini/normal の切り替え）

対象 entry が `type=stream` の場合:

- `streamSize < cutoff(4096)` なら mini stream 上の mini sector chain を miniFAT で辿る
  - `startingSector` は mini sector 番号として扱う
- `streamSize >= cutoff` なら通常セクタ chain を FAT で辿る
  - `startingSector` は通常セクタ番号

root entry（id=0）は mini stream の “実体” を指すため、runner は内部で mini stream bytes を保持する。

## 失敗モード（runner が明示的に throw すべきケース）

- 指定 path が存在しない / 同名が衝突する（仕様上はユニークだが破損ファイルでは起こり得る）
- object type が想定外
- child/sibling id が範囲外 / 循環している
- stream サイズとチェーン長が明らかに矛盾する（strict）

# CFB パーサ設計（低レベル）

## 目標

- 入力 `Uint8Array`（= `vbaProject.bin` の生バイト列）を、[MS-CFB] に基づいて解釈する。
- 「構造（header/FAT/MiniFAT/Directory）」の構築と、「ストリーム読取のための準備」を担当する。
- 破損ファイルに対しては、曖昧に進まず **明示的に throw** する（どの段階で何が不正かが分かるエラー）。

## 入口 API（案）

- `openCfb(bytes: Uint8Array, opts?: { strict?: boolean }): CfbFile`
  - `strict` が true の場合は [MS-CFB] の MUST/整合性を強めに検証。
  - false の場合は「読み取りに必要な最小限 + 明確に危険な破損のみ reject」。

`CfbFile` は少なくとも以下を提供:

- `header: CfbHeader`
- `directory: CfbDirectoryEntry[]`
- `getEntryById(id: number): CfbDirectoryEntry | undefined`
- `readStreamById(id: number): Uint8Array`（Runner 層でもよいが、低レベル primitive として用意）

## パース手順（段階）

### 1) Header を読む

- Signature を検証。
- Major Version から `sectorSize` を確定（512/4096）。
- `miniSectorSize=64`、`cutoff=4096` を確定。
- 主要フィールド（first directory/FAT/DIFAT/MiniFAT 等）を取得。
- `sectorNumber -> fileOffset` の計算を固定化する。

### 2) DIFAT を構築（= FAT セクタ所在の列挙）

- ヘッダ DIFAT[0..108] のうち `FREESECT` でないものを収集。
- `Number of DIFAT Sectors > 0` の場合:
  - `First DIFAT Sector Location` から DIFAT セクタチェーンを辿り、
  - 末尾 4 bytes の「Next DIFAT Sector Location」で次へ（最後は `ENDOFCHAIN`）。
  - 各 DIFAT セクタ内の配列を収集（末尾 4 bytes 以外）。
- 収集結果の length が `Number of FAT Sectors` と整合するかを検証（strict の場合）。

### 3) FAT 配列を読む

- DIFAT で列挙された FAT セクタそれぞれを読み、`Uint32Array` として連結して **FAT 配列**を得る。
- 最終 FAT セクタはファイル末尾を跨ぐエントリがあり、その範囲は `FREESECT` であるべき（strict 検証）。

### 4) Directory Stream を読む

- `First Directory Sector Location` から FAT チェーンを辿り directory stream bytes を組み立てる。
- 128 bytes ごとに Directory Entry をパースし、配列にする。
- `stream ID 0` は root であること（strict 検証）。

### 5) MiniFAT を読む（存在する場合）

- `First Mini FAT Sector Location` が `ENDOFCHAIN` の場合は MiniFAT なし。
- それ以外は、FAT チェーンで miniFAT stream bytes を読み、`Uint32Array` として miniFAT 配列を構築する。

### 6) Mini Stream を読む（存在する場合）

- root directory entry（id=0）の `Starting Sector Location` と `Stream Size` が mini stream を表す。
- mini stream 自体は FAT チェーンで読み出される（通常セクタ）。

## 低レベルユーティリティ（案）

### セクタ read

- `readSector(sectorNumber): Uint8Array`
  - fileOffset = `(sectorNumber + 1) * sectorSize` で slice
  - 範囲外/不正値は throw

### チェーン walker

- `walkFatChain(startSector): number[]`
  - `ENDOFCHAIN` まで辿る
  - 循環検出（visited set）
  - 不正値（`FREESECT`/範囲外）を発見したら throw

- `walkMiniFatChain(startMiniSector): number[]`
  - `miniFat[miniSector]` を辿る
  - 同様に循環検出

### stream reader primitive

- `readStreamFromFat(startSector, size): Uint8Array`
- `readStreamFromMiniFat(startMiniSector, size, miniStreamBytes): Uint8Array`

`size` と必要セクタ数の整合（`ceil(size / sectorSize)` 等）は strict 検証で必須。

## 型（例）

- `CfbHeader`（必要なフィールドのみ、Uint32/Uint16 等で保持）
- `CfbDirectoryEntry`
  - `name: string`
  - `type: "root" | "storage" | "stream" | "unused"`
  - `leftSiblingId/rightSiblingId/childId: number`
  - `startingSector: number`
  - `streamSize: bigint`（ただし version 3 は上位 32bit を無視する挙動が推奨されている点に注意）

## 例外設計（案）

- `CfbFormatError extends Error`（不正な構造/値）
- `CfbUnsupportedError extends Error`（version/機能の未対応）


# MS-CFB 要点まとめ（実装に必要な部分）

このドキュメントは `references/ms-cfb.pdf`（[MS-CFB]）のうち、実装で必要になる要点を抜粋・要約したものです。

## エンディアン

- ヘッダ/各構造の整数値は **リトルエンディアン**。

## セクタ番号と予約値（FAT などで使用）

- 通常のセクタ番号: `0x00000000`〜`0xFFFFFFF9`（REGSECT）
- 予約値（セクタを指す用途に使ってはいけない）
  - `DIFSECT = 0xFFFFFFFC`（DIFAT セクタ）
  - `FATSECT = 0xFFFFFFFD`（FAT セクタ）
  - `ENDOFCHAIN = 0xFFFFFFFE`（チェーン終端）
  - `FREESECT = 0xFFFFFFFF`（未割当）

## セクタサイズ

- Major Version = 3: Sector Shift = `0x0009` → 512 bytes
- Major Version = 4: Sector Shift = `0x000C` → 4096 bytes
- Mini Sector Shift は常に `0x0006` → Mini Sector は 64 bytes

## セクタ番号→ファイルオフセット

- ファイル内のセクタ `N` の先頭オフセット: `(N + 1) * SectorSize`
  - ヘッダ（512 bytes）はファイル先頭（offset 0）に固定であり、セクタ #0 はヘッダの次から始まる。

## Mini Stream と MiniFAT

- `Mini Stream Cutoff Size` は常に `0x1000`（4096 bytes）。
- ストリームサイズが cutoff 未満の場合、そのストリームは **Mini Stream** 上に配置され、**MiniFAT** で mini sector chain を辿る。
- Mini Stream 自体は「通常ストリーム」と同じく **FAT のセクタチェーン**でファイル内に配置される。
  - その開始セクタは **Root Directory Entry**（stream ID 0）の `Starting Sector Location`。
- Mini sector 番号→Mini Stream 内オフセット: `miniSector * 64`。

## Compound File Header（先頭 512 bytes）

最低限扱う主要フィールド:

- Signature: `D0 CF 11 E0 A1 B1 1A E1`
- Major Version: `0x0003` or `0x0004`
- Byte Order: `0xFFFE`
- Sector Shift / Mini Sector Shift
- Number of FAT Sectors
- First Directory Sector Location
- Mini Stream Cutoff Size（固定 0x1000）
- First Mini FAT Sector Location / Number of Mini FAT Sectors
- First DIFAT Sector Location / Number of DIFAT Sectors
- DIFAT[0..108]（先頭 109 個の FAT セクタ位置）

## DIFAT（FAT セクタの所在表）

- ヘッダに 109 エントリ分の DIFAT がある。
  - 足りない場合、`First DIFAT Sector Location` から DIFAT セクタチェーンを辿って残りを読む。
- DIFAT セクタは末尾 4 bytes が「次の DIFAT セクタ位置」で、残りが FAT セクタ位置配列。

## FAT（通常セクタチェーン）

FAT は「セクタ番号→次のセクタ番号」の配列。

- FAT セクタは DIFAT で場所を列挙して読み出す。
- FAT エントリ値は次のいずれか:
  - 通常セクタ番号（次のセクタ）
  - `ENDOFCHAIN` / `FREESECT` / `FATSECT` / `DIFSECT`

## Directory（128 bytes の Directory Entry 配列）

Directory は FAT セクタチェーンで配置される。

- `stream ID` は Directory Entry 配列のインデックス。
- `stream ID 0` は **Root Directory Entry** で、Mini Stream の開始セクタ/サイズもここに入る。

Directory Entry（128 bytes）の主要フィールド:

- Name（UTF-16LE, 64 bytes）と Name Length（終端 null を含む、bytes）
- Object Type: 0x00(unused) / 0x01(storage) / 0x02(stream) / 0x05(root)
- Left/Right Sibling ID / Child ID（RB-tree）
- Starting Sector Location（stream の開始セクタ、root の場合は mini stream 開始セクタ）
- Stream Size（stream のサイズ、root の場合は mini stream サイズ）

## チェーンの妥当性（重要）

- セクタチェーンは循環してはいけない。
- チェーン末尾は `ENDOFCHAIN`。
- チェーン長（確保セクタ数）は、DirectoryEntry の Stream Size と整合している必要がある。


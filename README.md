# interactive-patterns

このディレクトリは、Web ブラウザ上のインタラクション表現を研究・習作するための実験場です。

## 目的

- ユーザーインタラクションに反応するクリエイティブの研究と実装を行う
- マウスストーカー、重力シミュレーション、キネティックアート、3D 表現、インタラクティブ UI などを継続的に試作する
- 技術スタックを固定せず、都度最適なツールで検証する

## 対象範囲

- Canvas / SVG / WebGL / Three.js などのビジュアル実験
- Vue / React などを使ったインタラクティブ UI 実験
- 入力デバイス（マウス、タッチ、キーボード等）への反応を伴うプロトタイプ全般

## ディレクトリ運用ルール

- 1つの習作を 1 サブプロジェクトとして管理する
- サブプロジェクトは原則 `projects/<project-name>/` に作成する
- サブプロジェクトごとに依存関係を分離し、必要な `package.json` や設定ファイルはその配下で完結させる
- 各サブプロジェクトには `README.md` を置き、目的・起動方法・使用技術を記載する

## サブプロジェクトテンプレート運用

- リポジトリ直下の `SUBPROJECT_TEMPLATE.md` を、サブプロジェクト要件整理の共通テンプレートとして使う
- 新規作成時はテンプレートをコピーして `projects/<project-name>/README.md` として配置する
- 作成時に最低限埋める項目は `コンセプト` / `モチーフ` / `使用技術（ライブラリ）` / `対応デバイス` / `適用・応用するシーン`
- 仕様変更時は `決定ログ` と `既知の課題・未決` を更新し、判断履歴を残す

```bash
mkdir -p projects/<project-name>/sources/{images,screenshots}
cp SUBPROJECT_TEMPLATE.md projects/<project-name>/README.md
touch projects/<project-name>/sources/README.md
```

## `sources/` ディレクトリ運用ルール

- 各サブプロジェクトに `projects/<project-name>/sources/` を必須で作成する
- URL・画像・スクリーンショットなどのベンチマーク素材は、必ずそのサブプロジェクト配下の `sources/` に集約する
- ライセンス上保存できない素材はファイルを保存せず、`sources/README.md` に URL と備考だけを記録する
- 実装で参照した素材は `used_in`（参照先ファイルや機能名）を更新し、出典追跡可能にする

推奨構成:

```text
projects/<project-name>/
  README.md
  sources/
    README.md
    images/
    screenshots/
```

`sources/README.md` の記録フォーマット（推奨）:

| id | type | title | url/path | added_on | license | used_in | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| src-001 | url | Color reference (Ninagawa) | https://example.com | 2026-03-11 | link only | petals palette | 高彩度配色の参照 |
| src-002 | image | Runway texture sample | sources/images/20260311_runway_texture_01.jpg | 2026-03-11 | editorial reference | blur texture | 暗部の滲み感 |

命名ルール:

- `id`: `src-001` のような連番
- `images/` と `screenshots/` のファイル名: `YYYYMMDD_<short-topic>_<nn>.<ext>`
- スクリーンショットには取得日を含め、ページ更新差分を追えるようにする

## プロジェクトインデックス運用ルール（必須）

新しいサブプロジェクトを作成したら、**この README の「Project Index」とルートの `index.html` に必ず追記する**。

- 追記タイミング: サブプロジェクト作成時（同一コミット推奨）
- 記載項目（README）: `Name` / `Summary` / `Tech` / `Path` / `Status`
- 記載項目（index.html）: `プロジェクト名` / `進捗` / `リンク` / `最終更新日` / `概要`
- 既存行の更新: 方針変更・完了・保留など、**進捗が発生するたびに `index.html` を更新する**

## Project Index

| Name | Summary | Tech | Path | Status |
| --- | --- | --- | --- | --- |
| mouse-stalker | 黒い奥行き空間で花弁状の色彩が滲みながら沈むマウスストーカー習作 | Canvas 2D, Vanilla JS, Vite, SCSS | `projects/mouse-stalker` | done |
| mobile-kinetic-study | モビルアート・キネティックアートの揺動表現を検証する習作 | Canvas 2D, Vanilla JS | `projects/mobile-kinetic-study` | in-progress |
| elastic-2d-balls | 白黒二値で敷き詰め円の弾性と力学連鎖を可視化する習作 | Canvas 2D, Vanilla JS, Vite, SCSS | `projects/elastic-2d-balls` | done |
| fourier-transform-visualizer | 時間領域・周波数領域・エピサイクルでフーリエ分解を同時可視化する習作 | Canvas 2D, Vanilla JS | `projects/fourier-transform-visualizer` | in-progress |
| paulsmithy-tailored-stripes | ビビッドな多色ストライプを大人っぽい質感で揺らすインタラクション習作 | Canvas 2D, Vanilla JS | `projects/paulsmithy-tailored-stripes` | in-progress |

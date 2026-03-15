# Elastic 2D Balls

## Basic Info

- Project Name: Elastic 2D Balls
- Slug (`projects/<slug>`): `projects/elastic-2d-balls`
- Created: 2026-03-11
- Owner: kondo
- Status (`draft` / `in-progress` / `paused` / `done`): done

## 起動方法

- ローカル開発:
  - `cd projects/elastic-2d-balls`
  - `npm install`
  - `npm run dev`
  - `index.html` は dev 時に `src/main.js` を読み、静的確認時は生成済み `main.js` / `styles.css` を読む
- 本番用バンドル生成:
  - `npm run build`
  - `src/` の分割JS/SCSSがビルドされ、`main.js` / `styles.css` に同期される
- 静的確認:
  - `index.html` を直接開くか、`python3 -m http.server 8000` で配信して確認
- モード切替:
  - Normal: パラメータなし（例: `/projects/elastic-2d-balls/`）
  - Gradation: `?mode=gradation`（例: `/projects/elastic-2d-balls/?mode=gradation`）
  - Fine: `?mode=fine`（例: `/projects/elastic-2d-balls/?mode=fine`）
  - Mask: `?mode=mask`（例: `/projects/elastic-2d-balls/?mode=mask`）
- Mask texture切替:
  - `?mode=mask&texture=1|2|3` で候補画像を比較
  - HUDの `Texture 01/02/03` メニューから切替可能
- HUD toggle:
  - `Boost x2` を ON にすると、マウスオーバー円の拡大量を通常の2倍にする

## コード構成

- エントリ:
  - `src/main.js`
- View state:
  - `src/view/view-state.js`（URLパラメータ解決、mode/texture状態）
- HUD:
  - `src/hud/hud-controller.js`（HUDリンク、Texture表示条件、Boostトグル）
- Background:
  - `src/background/mask-textures.js`（runtimeで参照するテクスチャ定義）
  - `src/background/background-system.js`（背景画像の読み込み、body反映、mask描画）
- コアインタラクション:
  - `src/elastic/elastic-config.js`（調整パラメータ集約）
  - `src/elastic/circle-field.js`（円グリッド生成、近傍関係構築）
  - `src/elastic/elastic-renderer.js`（mode別描画）
  - `src/elastic/elastic-field.js`（入力、弾性シミュレーション、更新ループ）
- スタイル:
  - `src/styles/_base.scss`
  - `src/styles/_background.scss`
  - `src/styles/_hud.scss`
  - `src/styles/_modes.scss`
  - `src/styles/main.scss`（集約）
- ビルド設定:
  - `vite.config.js`
  - `package.json`
  - `scripts/sync-build.mjs`（必要に応じて build 出力を同期）
- 読解ドキュメント:
  - `UML.md`
  - `CODE_READING.md`

## コンセプト

「法則」

平面上に敷き詰められた円群が、ポインタ入力を力として受け取り、
拡大・圧縮・弾性復元を連鎖的に見せることで、力の法則を直感的に鑑賞できる体験を目指す。

## モチーフ

- 背景 `#fff` / 要素 `#000` のみで構成する
- 陰影・奥行き表現・ぼかしは使わない
- 記号的な円の集合体に、物理応答だけを与える

## 使用技術（ライブラリ）

- 言語: HTML / CSS / JavaScript
- 描画: Canvas 2D
- 実行時ライブラリ: なし（Vanilla）
- 開発時ツール: Vite / Sass
- 外部依存を採用する理由: 分割実装を単一成果物（`main.js` / `styles.css`）に集約しつつ、画像は `sources/images/` から差し替え可能に保つため

## 対応デバイス

- Desktop: 対応
- Mobile/Tablet: 対応
- 入力方式（mouse / touch / keyboard など）: Pointer Events（mouse / touch / pen）

## 適用・応用するシーン

- 物理インタラクションの基礎研究
- 展示向けインタラクティブ背景の原型
- 学習用の力学ビジュアライゼーション

## 体験ゴール

- 鑑賞者が直感的に力の法則を鑑賞できる
- マウス運動量に応じて反応強度が変わることを体感できる
- 力学理解を阻害する装飾（影・奥行き・ぼかし）を排除する

## インタラクション仕様

- 開始条件: pointer move / pointer down
- 追従ロジック:
  - 最寄り円がポインタ接近で拡大
  - 円同士の押し合いで周囲円が圧縮・変位
  - ポインタ近傍の円はポインタ方向へ吸着する
- エフェクト発火条件:
  - ポインタが円周近傍に入ると、その局所のみ外向きに伸長
  - 伸長量が閾値を超えるとスナップし、ポインタから離れる方向へ反発
- 消失条件: 変形と反発は減衰しながら基底形状へ復元
- 制限値（同時描画数、寿命、密度など）:
  - 画面密度に応じて円を自動配置
  - 円周変形は最大伸長/圧縮をクランプ
  - マウスオーバー円から離れるほど弾性影響を減衰

## ビジュアル仕様

- 色設計（主要カラー / 参考作品）: `#fff` / `#000` のみ
- レイヤー構成: 背景（白） / 円群（黒）
- 合成モード・ブラー・にじみ設定: 使用しない
- 背景処理:
  - Normal: 背景 `#fff`、円 `#000`、HUDは背景 `#000` + 文字 `#fff`
  - Gradation: 背景 `#fff`、未影響円は背景同化、影響円のみ `#ddd` までのグレースケール
  - Fine: Normalと同じ配色で、半径 `10px`、円同士の隙間は約 `8px`
  - Mask: 背景画像を全画面配置し、円形マスク内に同一画像を表示。ホバー円だけでなく影響を受けた近接円にも局所拡大を伝播（Texture 3種切替対応）

## パフォーマンス目標

- 目標 FPS: Desktop 60fps / Mobile 50fps
- 計測条件（端末 / ブラウザ）: macOS + Chrome, iOS Safari, Android Chrome
- 劣化戦略（低スペック時のフォールバック）: 半径/密度をリサイズ時に自動調整

## アクセシビリティ

- `prefers-reduced-motion` 対応: 有効時は挙動を減衰側に調整
- タッチ操作時の代替挙動: pointer イベントを共通処理
- コントラスト / 可読性の配慮: 白黒のみで高コントラストを維持

## 受け入れ条件

- [x] 画面全体に黒い円が敷き詰められている
- [x] ポインタ通過で対象円が拡大し、周囲が押し縮む
- [x] 円周接触で局所伸長し、閾値超過時に反発して減衰復元する
- [x] ポインタ運動量が反応強度に反映される

## テスト観点

- 対象ブラウザ: Chrome / Safari
- 対象端末: MacBook / iPhone / Android
- 確認手順:
  - ゆっくり移動と高速移動で反応差を比較
  - 円周付近でホールドし、伸長→反発→復元を確認

## Source References

- `sources/README.md` に参照元を記録する
- mask用画像を差し替える場合は `sources/images/` と `src/background/mask-textures.js` を更新する

## 既知の課題・未決

- 密度が高い端末での負荷最適化
- スナップ閾値の感触チューニング

## 決定ログ

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-03-11 | 最小実装は Canvas 2D + Vanilla JS に決定 | 力学挙動の検証を最短で進めるため |
| 2026-03-11 | 色は `#fff/#000` の二値に固定 | 体験ゴールを阻害する装飾を排除するため |

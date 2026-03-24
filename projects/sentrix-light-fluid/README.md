# Sentrix Light Fluid

## Basic Info

- Project Name: Sentrix Light Fluid
- Slug (`projects/<slug>`): `projects/sentrix-light-fluid`
- Created: 2026-03-24
- Owner: kondo
- Status (`draft` / `in-progress` / `paused` / `done`): done

## 起動方法

- 初回のみ依存導入: `cd projects/sentrix-light-fluid && npm install`
- 開発サーバー: `npm run dev`
- ビルド（`main.js` / `styles.css` を書き出し）: `npm run build`
- ビルド成果物確認: `index.html` をブラウザで開く、または `npm run preview`

## ファイル構成

- `src/main.js`: メディア条件に応じて WebGL 流体を起動するブートストラップ
- `src/styles/main.scss`: 静的背景、ライトビーム、HUD のスタイル
- `main.js`: Vite ビルド出力（単一ファイル）
- `styles.css`: Vite ビルド出力（単一ファイル）
- `sources/README.md`: 参照元 URL と利用箇所の記録

## コンセプト

SENTRIX トップページで見えた「静止した白い光束の背景に、マウスで淡いにじみを走らせる」感触だけを抜き出し、最小構成で再現する。

## モチーフ

- 固定背景のライトビーム
- 透明 `canvas` 上の薄い流体にじみ
- 背景画像そのものではなく、質感とレイヤー構造の再解釈

## 使用技術（ライブラリ）

- 言語: HTML / SCSS / JavaScript (Vanilla)
- 描画: WebGL + CSS layered background
- 主要ライブラリ: `webgl-fluid`, Vite, Sass
- 外部依存を採用する理由: SENTRIX 側で観測した流体系 WebGL エフェクトを短時間で比較検証できるため

## 対応デバイス

- Desktop: 対応
- Mobile/Tablet: 静止背景のみ表示
- 入力方式（mouse / touch / keyboard など）: mouse hover

## 適用・応用するシーン

- ヒーロー背景の挙動検証
- 企業サイトの静的背景に対する軽いインタラクション付与
- 「派手すぎない WebGL 演出」の初期検証

## 体験ゴール

- マウス移動で光の層がわずかににじむ
- 背景自体は静止し、前景の体験だけが反応する
- 参照サイトの雰囲気を保ちつつ、最小実装として読みやすい

## インタラクション仕様

- 開始条件: Desktop かつ `prefers-reduced-motion` 無効の環境で初期化
- 追従ロジック: `webgl-fluid` の hover トリガでマウス位置へ流体を注入
- エフェクト発火条件: `mousemove`
- 消失条件: 流体の拡散と散逸で自然消失
- 制限値（同時描画数、寿命、密度など）: `SIM_RESOLUTION 128`, `DYE_RESOLUTION 1024`, `SPLAT_FORCE 6000`, `SPLAT_RADIUS 0.2`

## ビジュアル仕様

- 色設計（主要カラー / 参考作品）: 白から薄灰の背景に、青みを削った淡色にじみ
- レイヤー構成: ベース背景 / ライトビーム / 流体 canvas / pointer bloom / 粒状ノイズ / ベール
- 合成モード・ブラー・にじみ設定: `plus-lighter` と CSS blur で淡い発光に寄せる
- 背景処理: CSS グラデーションで光束を静止配置

## パフォーマンス目標

- 目標 FPS: Desktop 60fps
- 計測条件（端末 / ブラウザ）: macOS + Chrome 最新版
- 劣化戦略（低スペック時のフォールバック）: mobile と reduced motion では流体を無効化して静止背景のみ表示

## アクセシビリティ

- `prefers-reduced-motion` 対応: 流体を起動しない
- タッチ操作時の代替挙動: 静止背景のみ表示
- コントラスト / 可読性の配慮: テキストを前景固定し、背景演出のコントラストを抑制

## 受け入れ条件

- [x] Desktop でマウス移動に応じた淡い流体にじみが見える
- [x] 流体レイヤーの背面に静止ライトビーム背景がある
- [x] Mobile または reduced motion では静止背景のみになる

## テスト観点

- 対象ブラウザ: Chrome 最新版
- 対象端末: macOS Desktop, narrow viewport
- 確認手順: `npm install && npm run build` 後、ローカルサーバーで `index.html` を開いて hover を確認

## Source References

- `sources/README.md` に使用元の URL・画像・ライセンス情報を記録する
- 実装で参照した素材は `used_in` を更新して追跡可能にする

## 既知の課題・未決

- 参照サイトの「1 秒無操作で RAF を止める」最適化までは未再現
- `webgl-fluid` の内部色生成に依存しているため、完全な固定色再現ではない

## 決定ログ

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-03-24 | 背景は画像トレースではなく CSS の静止ライトビームで再構成 | 参照の質感だけを抽出して習作として扱うため |
| 2026-03-24 | 流体系は `webgl-fluid` を採用 | SENTRIX 側で観測した WebGL 流体系挙動を最短で検証するため |
| 2026-03-24 | mobile / reduced motion は静止背景のみとする | 参照サイトと同じく過剰な描画を避けるため |
| 2026-03-24 | pointer bloom を補助レイヤーとして追加 | 静止キャプチャでも hover の読解性を確保するため |

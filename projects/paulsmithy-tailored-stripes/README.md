# PaulSmithy Tailored Stripes

## Basic Info

- Project Name: PaulSmithy Tailored Stripes
- Slug (`projects/<slug>`): `projects/paulsmithy-tailored-stripes`
- Created: 2026-03-11
- Owner: kondo
- Status (`draft` / `in-progress` / `paused` / `done`): in-progress

## 起動方法

- ブラウザで `index.html` を開く
- もしくはローカルサーバー: `cd projects/paulsmithy-tailored-stripes && python3 -m http.server 8000`

## コンセプト

「鮮烈なのに仕立てが良い、色の揺らぎ」

ビビッドなマルチストライプを、布地のようなシアー変形で揺らし、
派手さと落ち着きが同居する大人のテンションをインタラクション化する。

## モチーフ

- Paul Smithらしい高彩度ストライプのリズム感
- テーラードジャケットの「仕立て線」を思わせる細いピンストライプ
- 艶を抑えた紙質背景と、色帯の陰影だけで成立する上質感

## 使用技術（ライブラリ）

- 言語: HTML / CSS / JavaScript
- 描画: Canvas 2D
- 主要ライブラリ: なし（Vanilla）
- 外部依存を採用する理由: なし（習作の反応速度と配色検証を優先）

## 対応デバイス

- Desktop: 対応
- Mobile/Tablet: 対応
- 入力方式（mouse / touch / keyboard など）: Pointer Events + keyboard（Space/Enter/S）

## 適用・応用するシーン

- ブランドトーンを含むWeb演出のモーション試作
- ランディングページのヒーロー背景
- 展示・ポートフォリオ向けの高彩度インタラクション

## 体験ゴール

- 触るほど色帯が柔らかく流れ、画面に「仕立て感」が出る
- クリック/タップで走るパルスが、色の列を音楽的に揺らす
- 高彩度でも軽薄にならない、落ち着いた空気を維持する

## インタラクション仕様

- 開始条件: pointer move / pointer down
- 追従ロジック:
  - ポインタ速度と距離に応じて各ストライプをシアー変形
  - 上端/下端を別スプリングで制御し、布の捻れを再現
- エフェクト発火条件:
  - クリック/タップで横方向パルス波を発生
  - `Pulse` ボタン、`Space`/`Enter` でも同等の波を発火
  - `Shuffle Tone` ボタン、`S` キーで配色セットを切替
- 消失条件: パルスは指数減衰し、全帯が基底運動へ復帰
- 制限値（同時描画数、寿命、密度など）:
  - 画面幅に応じて帯本数を自動算出
  - パルス寿命は最大約3.4秒
  - 変形量は上下それぞれクランプ

## ビジュアル仕様

- 色設計（主要カラー / 参考作品）: ネイビー/レッド/オレンジ/ティール/マスタード中心の高彩度群
- レイヤー構成: 紙質背景（CSS） / 空気層（Canvas） / ストライプ本体 / ピンストライプ線 / HUD
- 合成モード・ブラー・にじみ設定: ストライプ内部に線形陰影を重ねて柔らかい艶を付与
- 背景処理: ライトベージュのグラデーション + 微細グリッドノイズ

## パフォーマンス目標

- 目標 FPS: Desktop 60fps / Mobile 50fps
- 計測条件（端末 / ブラウザ）: macOS + Chrome, iOS Safari, Android Chrome
- 劣化戦略（低スペック時のフォールバック）: `prefers-reduced-motion` 時は運動振幅・導入演出を縮小

## アクセシビリティ

- `prefers-reduced-motion` 対応: 振幅を約45%に抑制し、導入スタッガーを短縮
- タッチ操作時の代替挙動: pointer イベントで同等挙動を提供
- コントラスト / 可読性の配慮: HUDに半透明背景を持たせ文字を常時可読化

## 受け入れ条件

- [ ] ストライプが画面全体を覆い、ポインタ移動で流れる
- [ ] クリック/タップおよび `Pulse` 操作で横波パルスが発生する
- [ ] `Shuffle Tone` で雰囲気を保ったまま配色が切り替わる
- [ ] Desktop/Mobile 両方で破綻なく操作できる

## テスト観点

- 対象ブラウザ: Chrome / Safari
- 対象端末: MacBook / iPhone / Android
- 確認手順:
  - 低速/高速ドラッグでシアー挙動の差を確認
  - 連続タップでパルス減衰と復帰を確認
  - `prefers-reduced-motion` 有効時の振幅低減を確認

## Source References

- `sources/README.md` に参照元を記録する

## 既知の課題・未決

- 高解像度タブレットでの最大帯本数上限は要チューニング
- HUD文言の多言語切替は未対応

## 決定ログ

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-03-11 | 新規サブプロジェクト `paulsmithy-tailored-stripes` を作成 | 既存習作と分離して配色・挙動を独立検証するため |
| 2026-03-11 | Canvas 2D + Vanilla JS を採用 | 配色と弾性シアーの反応を軽量に反復するため |

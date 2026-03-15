# Elastic 2D Balls Code Reading Checklist

このドキュメントは、現在の分割構成に沿ってコードを読む順番を固定するためのガイドです。  
最初に `README.md` と `UML.md` を確認し、そのあとで下記の順に追うと迷いにくくなります。

## 1. 全体の入口を見る

対象:

- `src/main.js`

確認ポイント:

- [ ] 起動時に `viewState`、`backgroundSystem`、`hudController`、`elasticField` がどう組み立てられるか説明できる
- [ ] `beforeunload` で `destroy()` を呼ぶ理由を説明できる

## 2. mode と texture の解決を見る

対象:

- `src/view/view-state.js`
- `src/background/mask-textures.js`

確認ポイント:

- [ ] `mode` の許可値とデフォルト値を説明できる
- [ ] `texture` の clamp と route 生成ルールを説明できる
- [ ] `sources/images/` を runtime 参照することで画像差し替えをしやすくしていることを説明できる

## 3. HUD の責務を見る

対象:

- `src/hud/hud-controller.js`

確認ポイント:

- [ ] Modeリンク active 切替の責務を説明できる
- [ ] `TEXTURE` が `MASK` の時だけ出る条件を説明できる
- [ ] `Boost x2` が `interactionState.hoverBoostMultiplier` に繋がる経路を説明できる

## 4. 背景画像の責務を見る

対象:

- `src/background/background-system.js`

確認ポイント:

- [ ] body の `data-mode` と `--mask-background-image` をどこで設定しているか説明できる
- [ ] 画像の cover rect をどう計算しているか説明できる
- [ ] maskモードでの円形クリップ描画がどこにあるか説明できる

## 5. 調整パラメータを見る

対象:

- `src/elastic/elastic-config.js`

確認ポイント:

- [ ] 通常値、reduced motion、mode別値がどこで分かれているか説明できる
- [ ] 反応の強さ、減衰、maskズーム、gradationトーンの入口を指させる

## 6. 円グリッドの構築を見る

対象:

- `src/elastic/circle-field.js`

確認ポイント:

- [ ] 円半径の決定と `fine` 固定半径の扱いを説明できる
- [ ] 近傍関係の構築方法を説明できる

## 7. コアシミュレーションを見る

対象:

- `src/elastic/elastic-field.js`

確認ポイント:

- [ ] `applyPointerInfluence()` が hover / attraction / rim stretch / gradation propagation をまとめていることを説明できる
- [ ] `resolveCollisions()` と `integrate()` の分担を説明できる
- [ ] 遠い円ほど弾性影響が弱くなる計算位置を説明できる

## 8. 描画分岐を見る

対象:

- `src/elastic/elastic-renderer.js`

確認ポイント:

- [ ] `normal`, `gradation`, `mask` の描画差分を説明できる
- [ ] mask時に背景画像ズームが影響円へ伝播する経路を説明できる

## 9. SCSS とビルドを見る

対象:

- `src/styles/_base.scss`
- `src/styles/_background.scss`
- `src/styles/_hud.scss`
- `src/styles/_modes.scss`
- `src/styles/main.scss`
- `vite.config.js`
- `scripts/sync-build.mjs`

確認ポイント:

- [ ] 背景設定と mode別見た目が別ファイルになっていることを説明できる
- [ ] `npm run build` 後に `main.js` / `styles.css` を同期する理由を説明できる

## 調整の入口メモ

- 円の強い反応: `src/elastic/elastic-config.js` の `hoverBoostBase`, `hoverMomentumGain`
- 吸着感: `src/elastic/elastic-config.js` の `attractBase`, `attractMomentumGain`
- 影響伝播距離: `src/elastic/elastic-config.js` の `elasticFalloffRangeScale`
- fine密度: `src/elastic/elastic-config.js` の `fixedRadius`, `circleGap`
- maskズーム: `src/elastic/elastic-config.js` の `maskZoomGain`, `maskInfluenceZoomGain`

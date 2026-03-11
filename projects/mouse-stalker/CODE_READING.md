# Mouse Stalker Code Reading Checklist

このドキュメントは、実装済みコードを「どこから・何を見るか」で迷わないための読解ガイドです。  
読む順番は固定し、各ステップで「注目変数」「注目関数」「確認ポイント」を明示します。

## 0. 読み方ルール

- 1ステップずつ読む
- 各ステップ終了時に「自分の言葉で3行要約」を残す
- 関数名は必ず実コード上でジャンプして追う
- 「物理的処理（関数）」と「演出的意味（体験）」を対応づける

## 1. 全体像を掴む（README → UML）

対象:

- `README.md`
- `UML.md`

注目ポイント:

- モジュール分離方針（背景/ストーカー/ブートストラップ）
- 実行開始点（DOMContentLoaded → bootstrap）
- 演出ライフサイクル（滲み → 合焦ヒント → 再拡散 → 消失）

チェックリスト:

- [ ] サブプロジェクトの責務分割を説明できる
- [ ] `BackgroundLayer` と `StalkerLayer` の依存関係を説明できる
- [ ] UMLの参加者が実ファイルのどこに対応するか言える

## 2. 起動とフレーム進行を読む（src/main.js）

対象:

- `src/main.js`

注目変数:

- `canvas`
- `ctx`
- `background`
- `stalker`

注目関数:

- `bootstrap`
- `resizeCanvas`
- `animate`

チェックリスト:

- [ ] 初期化順序を説明できる（canvas取得 → layer生成 → attach → resize → RAF）
- [ ] 1フレーム内の描画順を説明できる（trail → background → stalker）
- [ ] `resize`時に背景再構成が走る理由を説明できる

## 3. 背景モジュールを読む（src/background/background.js）

対象:

- `src/background/background.js`

注目変数:

- `DEFAULT_BACKGROUND_CONFIG`
- `this.config`
- `this.hazeCanvas`
- `this.noiseTile`

注目関数:

- `mergeBackgroundConfig`
- `resize`
- `draw`
- `#buildHazeLayer`
- `#createBackgroundNoiseTile`

チェックリスト:

- [ ] 背景が「静止レイヤー再利用」であることを説明できる
- [ ] ヘイズ色場の設計要素（fields/stops/lightBoosts/alphaScale）を説明できる
- [ ] ディザ粒子がバンディングをどう緩和するか説明できる
- [ ] 背景PNG差し替え時に変更すべき箇所を特定できる

## 4. ストーカーモジュールの公開面を読む（src/stalker/stalker.js）

対象:

- `src/stalker/stalker.js` の前半（constructor〜公開メソッド）

注目変数:

- `this.pointer`
- `this.stalker`
- `this.state`
- `this.viewport`
- `this.motionQuery`

注目関数:

- `constructor`
- `runtimeConfig`
- `attach`
- `detach`
- `dispose`
- `resize`
- `update`
- `drawTrail`
- `draw`

チェックリスト:

- [ ] 入力イベント購読と解除の責務を説明できる
- [ ] reduced motion の反映経路を説明できる
- [ ] `update`と`draw`が分離されている理由を説明できる

## 5. ストーカー内部の演出パイプラインを読む（src/stalker/stalker.js）

対象:

- `src/stalker/stalker.js` の内部ロジック一式

注目変数:

- `DEFAULT_TUNING`
- `cluster.age`
- `cluster.depth`
- `fadeProgress`
- `focusGain`
- `depthScale`

注目関数:

- `spawnAtStalker`
- `updateClusters`
- `pickColor`
- `drawOrganicPetalPath`
- `createCluster`
- `createClusterSprite`
- `drawCluster`
- `drawStalkerGlow`

演出解釈の対応:

- `spawnAtStalker` = 発生条件の管理
- `createCluster` = 花弁群の初期配置
- `drawCluster` = 滲み/合焦ヒント/再拡散/奥行き消失
- `drawStalkerGlow` = ストーカー存在感の補助

チェックリスト:

- [ ] 1クラスタの一生（生成→更新→削除）を時系列で説明できる
- [ ] ブラー/彩度/明度の計算が体験にどう効くか説明できる
- [ ] `TUNING`変更で見た目が変わる地点を特定できる

## 6. スタイル分離を読む（src/styles）

対象:

- `src/styles/_background.scss`
- `src/styles/_stalker.scss`
- `src/styles/main.scss`

注目ポイント:

- 背景側とUI側の責務分離
- `main.scss`での集約
- HUDフォントと可読性設定

チェックリスト:

- [ ] 背景由来スタイルとストーカーUI由来スタイルを区別できる
- [ ] SCSSの編集起点を迷わず選べる

## 7. ビルド境界を読む（package.json / vite.config.js）

対象:

- `package.json`
- `vite.config.js`

注目ポイント:

- `src/main.js` を単一IIFEへビルドしている点
- CSSを単一`styles.css`へまとめる設定
- `build`後に`dist`からルートへ同期する運用

チェックリスト:

- [ ] `npm run dev` と `npm run build` の違いを説明できる
- [ ] 最終成果物が `main.js` / `styles.css` になる理由を説明できる
- [ ] 将来の背景差し替え時にビルド構成変更が必要か判断できる

## 読了確認（最終）

- [ ] 「この実装の責務分割」を1分で説明できる
- [ ] 「演出パラメータ変更の入口」を迷わず指させる
- [ ] 「背景差し替え（例: PNG固定背景）」の実施手順を説明できる

## 読解メモ記入テンプレート（各ステップ3行要約）

### Step 0: 読み方ルール

3行要約:
1.
2.
3.

疑問点:

次に確認するポイント:

### Step 1: 全体像（README → UML）

3行要約:
1.
2.
3.

疑問点:

次に確認するポイント:

### Step 2: 起動とフレーム進行（src/main.js）

3行要約:
1.
2.
3.

疑問点:

次に確認するポイント:

### Step 3: 背景モジュール（src/background/background.js）

3行要約:
1.
2.
3.

疑問点:

次に確認するポイント:

### Step 4: ストーカーモジュール公開面（src/stalker/stalker.js 前半）

3行要約:
1.
2.
3.

疑問点:

次に確認するポイント:

### Step 5: ストーカー内部演出パイプライン（src/stalker/stalker.js）

3行要約:
1.
2.
3.

疑問点:

次に確認するポイント:

### Step 6: スタイル分離（src/styles）

3行要約:
1.
2.
3.

疑問点:

次に確認するポイント:

### Step 7: ビルド境界（package.json / vite.config.js）

3行要約:
1.
2.
3.

疑問点:

次に確認するポイント:

### Final: 読了後まとめ

責務分割の説明（1分版）:

演出調整の入口（最重要パラメータ）:

背景差し替え実施手順（簡易版）:

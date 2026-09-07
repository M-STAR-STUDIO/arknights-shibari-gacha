# アークナイツ縛りガチャ

全オペレーターからランダムに12体を引き、そのまま編成として遊ぶための非公式ファンツール。

- 公開URL: https://mon3tr-s.github.io/arknights-shibari-gacha/
- 制作: M Star Studio

## 仕組み

サーバー処理のない静的サイトです。フレームワークや npm 依存はありません。

| ファイル | 役割 |
|---|---|
| `index.html` / `css/style.css` | 画面 |
| `js/app.js` | 画面の状態管理(引く → めくる → 結果 → 再抽選 → もう一回) |
| `js/gacha.js` | 抽選ロジック(4モードの確率、重複なし、再抽選) |
| `js/assets.js` | 画像URLと読み込み(CDN) |
| `js/share.js` | シェア画像(1600×900、2行×6列)を Canvas で生成 |
| `js/ogp.js` + `scripts/ogp.html` | OGP画像 `assets/ogp.png` の生成(開発時のみ) |
| `data/operators.json` | オペレーター一覧(自動生成) |
| `scripts/build-data.mjs` | 上記 JSON を生成するスクリプト |

## データと画像の取得元

- オペレーターデータ: [ArknightsAssets/ArknightsGamedata](https://github.com/ArknightsAssets/ArknightsGamedata) の `jp/`(グローバル版=日本版に実装済みのもののみ)
- 顔アイコン: [yuanyan3060/ArknightsGameResource](https://github.com/yuanyan3060/ArknightsGameResource) の `avatar/`
- 職分アイコン: [Aceship/Arknight-Images](https://github.com/Aceship/Arknight-Images) の `classes/`

画像はリポジトリに含めず、jsDelivr CDN 経由で表示時に読み込みます。読み込みに失敗したカードはキャラ名を表示します。

## オペレーターデータの更新

GitHub Actions(`.github/workflows/update-data.yml`)が毎週月曜に自動で取得し、変化があればコミットします。
手動で更新したいときは Actions タブから「Update operator data」を "Run workflow" するか、ローカルで:

```bash
node scripts/build-data.mjs
```

## ローカルで確認する

```bash
node scripts/dev-server.mjs 8080
```

ブラウザで http://localhost:8080/ を開きます。

OGP画像を作り直すときは http://localhost:8080/scripts/ogp.html を開いて「生成して保存」を押します(`assets/ogp.png` が上書きされます)。

## 公開

`main` ブランチに push すると `.github/workflows/deploy.yml` が GitHub Pages に配信します。

## 権利表記

本サイトは非公式のファンコンテンツです。『アークナイツ』およびオペレーターの名称・画像等に関する権利は ©Hypergryph / Yostar に帰属します。

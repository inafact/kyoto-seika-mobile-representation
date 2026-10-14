# PWA デバイス機能デモ

[mobile-web-device-capabilities-2026.md](./mobile-web-device-capabilities-2026.md) の調査結果をもとに、iOS Safari（Safari 26）と Android Chrome の最新版で Web から使えるデバイス機能を試せる PWA です。Vite + vanilla TypeScript で作っていて、実行時の依存ライブラリはありません。

## デモ一覧

| 画面 | API | iOS | Android |
|---|---|---|---|
| 対応状況チェッカー | 調査表の全 API を機能検出 | — | — |
| 位置情報 | Geolocation | ◎ | ◎ |
| カメラ | getUserMedia（前面/背面、撮影、ライト・ズームは対応端末のみ） | ◎ | ◎ |
| 録音・録画 | MediaRecorder | ◎ | ◎ |
| 加速度・ジャイロ・方位 | DeviceMotion / DeviceOrientation | △ | ◎ |
| 画面ロック防止 | Screen Wake Lock | ◎ | ◎ |
| 通知（ローカル） | Notifications + SW showNotification | △ | ◎ |
| バッジ | Badging API | △ | △ |
| 共有シート | Web Share（テキスト・画像ファイル） | ◎ | ◎ |
| パスキー | WebAuthn（クライアントのみ、サーバー検証なし） | ◎ | ◎ |
| 音声 | Web Speech（読み上げ・音声認識） | △ | ◎ |
| GPU | WebGPU（非対応なら WebGL2） | ◎ | ◎ |
| ファイル保存・オフライン | OPFS / StorageManager / Service Worker | ◎ | ◎ |

iOS の通知とバッジは、ホーム画面に追加したアプリから起動した場合のみ動きます（Safari の共有メニュー →「ホーム画面に追加」）。

iOS では手動操作が前提になる「インストール（ホーム画面に追加）」と「全画面表示」はデモ画面に含めていません。対応状況チェッカーでは、調査表の項目として Fullscreen API の有無だけを表示します。

## 開発

```sh
npm install
npm run dev        # http://localhost:5173（--host 付きなので LAN からも見える）
npm run build      # 型チェック + dist/ に出力
npm run preview    # ビルド結果を確認
```

- アイコンは `public/icon.svg` から生成します。SVG を変えたら `npm run generate-pwa-assets` を実行してください。
- カメラ・位置情報・センサーなどは HTTPS（または localhost）でしか動きません。実機で確認するときは Cloudflare Pages にデプロイした URL を使うのが簡単です。

## 構成

```
src/
  main.ts            ハッシュルーター・SW 登録・更新バナー
  sw.ts              Service Worker（precache、オフライン、通知タップ）
  features/*.ts      1 機能 = 1 ファイル（Feature 型）。index.ts で一覧に登録
  lib/               DOM ヘルパ・OS 判定
  workers/           OPFS 書き込み用 Worker（createWritable が無い環境向け）
public/_headers      Cloudflare Pages のレスポンスヘッダー
wrangler.toml        Cloudflare Pages の設定
```

機能を追加するときは、`src/features/` に `Feature` を export するファイルを作り、`src/features/index.ts` の配列に加えてください。

## Cloudflare Pages へのデプロイ

### A. Git 連携（push で自動デプロイ）

Cloudflare ダッシュボード → Workers & Pages → Create → Pages → Connect to Git でこのリポジトリを選び、次のように設定します。

| 項目 | 値 |
|---|---|
| Framework preset | None |
| Root directory | `20261014` |
| Build command | `npm run build` |
| Build output directory | `dist` |

Node のバージョンは `.node-version`（22）から読み込まれます。

### B. CLI から直接アップロード

```sh
npx wrangler login     # 初回のみ。ブラウザで Cloudflare にログイン
npm run deploy         # ビルドして wrangler pages deploy（プロジェクト名は wrangler.toml の name）
```

初回のデプロイでプロジェクトが作られ、`https://pwa-device-demo.pages.dev` のような URL で公開されます。

### ヘッダー（`public/_headers`）

- `sw.js` と `manifest.webmanifest` は `no-cache` にして、更新がすぐ届くようにしています。
- `/assets/*` はファイル名にハッシュが付くので、1 年間キャッシュします。
- `Permissions-Policy` で、カメラ・マイク・位置情報・センサーなどを自分のオリジンにだけ許可しています。

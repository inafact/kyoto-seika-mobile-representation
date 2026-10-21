# RealityKit AR Samples

RealityKit / ARKit を使った、iOS 向けの2つの小さな AR サンプルアプリ

| プロジェクト | 内容 | 使うもの |
|---|---|---|
| [RealityKitArrowSample](RealityKitArrowSample/) | 設定した緯度経度の方向を、カメラ映像の上に 3D の矢印で常に表示する | カメラ、位置情報、コンパス |
| [RealityKitTaggingSample](RealityKitTaggingSample/) | ARKit が検出した平面（床・机・壁など）を指でなぞって、色を塗る | カメラ |

## 必要な環境

- Xcode 27.1 以上
- iOS / iPadOS 27.0 以上の、ARKit に対応した iPhone / iPad の実機（シミュレータでは AR が動きません）
- Apple Developer のアカウント（実機で動かすための署名に使います。無料のアカウントでも可）

## セットアップ

1. 署名の設定ファイルを作ります。

   ```sh
   cp Config/Local.xcconfig.example Config/Local.xcconfig
   ```

2. `Config/Local.xcconfig` に、自分の Team ID とバンドル ID の接頭辞を書きます。

   ```
   DEVELOPMENT_TEAM = ABCDE12345
   BUNDLE_ID_PREFIX = com.yourname
   ```

   アプリのバンドル ID は `<接頭辞>.RealityKitArrowSample` のようになります。
   Team ID は、Xcode の「Settings」→「Accounts」でチームを選ぶか、developer.apple.com の Membership で確認できます。

3. 動かしたいプロジェクトの `.xcodeproj` を Xcode で開き、実行先に実機を選んで ⌘R を押します。

両方のプロジェクトが、`Config/Signing.xcconfig` を通してこのファイルを読み込みます。

> **Team は Xcode の「Signing & Capabilities」で選ばないでください。**
> 画面で選ぶと、`project.pbxproj` に Team ID が書き戻されます。Team は `Local.xcconfig` で設定してください。

## ライセンス

[MIT License](LICENSE)

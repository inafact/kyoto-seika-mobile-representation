# モバイルWebアプリで使えるデバイス機能と、ネイティブアプリとの比較（2026年10月時点）

iOS／Android のブラウザで動くWebアプリから、どのデバイス機能が使えるかを整理しました。あわせて、iOSのWebで使えない機能がネイティブアプリなら実現できるかも整理しています。

---

## 1. 前提：iOSのブラウザエンジン事情

- iOSのChromeやFirefoxも、基本的にSafariと同じWebKitエンジンで動いている。そのため、iOSで使える機能はブラウザを変えても変わらない。
- **EU**：iOS 17.4以降、WebKit以外のブラウザエンジンが許可されている。ただしAppleの要件が厳しく、主要な非WebKitブラウザはまだ出ていない状況だった。
- **日本**：スマホ新法（モバイル・ソフトウェア競争促進法）により、Appleは2025年12月までに代替エンジン（Blink・Gecko）への制限を解除する必要がある。デスクトップやAndroid版と同等の機能を持つブラウザが登場する道が開かれた。
  - 日本向けのBlink版Chromeなどが実際に配信されているかは、各自で確認すること。

---

## 2. ブラウザから使えるデバイス機能

凡例：◎＝通常のブラウザで使える ／ △＝条件付き ／ ×＝使えない

| 機能 | API | iOS Safari | Android Chrome | 備考 |
|---|---|---|---|---|
| 位置情報 | Geolocation | ◎ | ◎ | HTTPSと許可が必要。ページを開いている間だけ取得でき、バックグラウンドでは取得不可 |
| カメラ・マイク | getUserMedia / MediaRecorder | ◎ | ◎ | 前面・背面カメラを選べる。ズームやライトなどの制御はAndroidの方が細かくできる |
| 加速度・ジャイロ・方位 | DeviceMotion / DeviceOrientation | △ | ◎ | iOSではユーザー操作をきっかけに `requestPermission()` を呼んで許可を得る必要がある |
| 高精度センサー | Generic Sensor API（Accelerometer, Gyroscope, Magnetometer など） | × | ◎ | Chrome系のみ対応 |
| 照度・近接センサー | Ambient Light / Proximity | × | × | 実用的に使える環境はない |
| 振動 | Vibration API | × | ◎ | iOSでは使えない |
| 画面ロック防止 | Screen Wake Lock | ◎ | ◎ | |
| 画面の向き固定 | Screen Orientation lock | × | △ | Androidは全画面表示中またはインストール済みPWAで使える |
| 全画面表示 | Fullscreen API | △ | ◎ | iPhoneは動画要素のみ。iPadは対応 |
| プッシュ通知 | Web Push / Notifications | △ | ◎ | iOSはホーム画面に追加したWebアプリでのみ使える（16.4以降） |
| アプリアイコンのバッジ | Badging API | △ | △ | どちらもインストール済みPWAが前提 |
| 共有シート | Web Share API | ◎ | ◎ | |
| 生体認証・パスキー | WebAuthn | ◎ | ◎ | Face ID・Touch ID・指紋認証を使える |
| 決済 | Payment Request / Apple Pay / Google Pay | ◎ | ◎ | |
| デジタルID | Digital Credentials API | ◎ | ◎ | iOS 26で追加 |
| GPU処理 | WebGPU / WebGL | ◎ | ◎ | WebGPUはSafari 26でiOS・iPadOSでも提供開始 |
| AR | WebXR | ×（AR Quick Lookで代替） | ◎ | iPhoneはUSDZファイルをQuick Lookで表示する方式になる |
| 音声認識 | Web Speech API | △ | ◎ | プレフィックス付きで使える。精度や継続認識には差がある |
| バーコード読み取り | Barcode Detection API | × | ◎ | iOSではJavaScriptライブラリで代用する |
| 連絡先の取得 | Contact Picker | × | ◎ | |
| Bluetooth（BLE） | Web Bluetooth | × | ◎ | iOSは非対応。サードパーティの拡張機能（WebBLEなど）で補う方法がある |
| NFC | Web NFC | × | ◎ | Androidのみ |
| USB | WebUSB | × | ◎ | Android端末にOTGで接続した機器が対象 |
| シリアル通信 | Web Serial | × | △ | AndroidではBluetooth RFCOMM経由のシリアル接続に対応。有線シリアルはAndroid側の対応待ち |
| HID・MIDI | WebHID / Web MIDI | × | △ | Android Chromeで一部対応 |
| バッテリー・ネットワーク情報 | Battery Status / Network Information | × | ◎ | |
| バックグラウンド同期 | Background Sync / Periodic Sync | × | ◎ | |
| ファイル保存 | OPFS | ◎ | ◎ | ブラウザ内の領域。端末のファイルを直接選んで読み書きする機能は、モバイルではほぼ使えない |

### 設計上のポイント

- **iOSとAndroidの差の理由**：Bluetooth・NFC・USB・シリアル・HID・MIDI・各種センサーなどのハードウェア系APIは、Appleがプライバシーとセキュリティを理由に実装を見送ってきた。Firefoxも同様に実装しない方針を示している。そのため、これらは事実上Chromium系ブラウザだけの機能と考える。
- **iOSは「ホーム画面に追加」が前提の機能が多い**：プッシュ通知とバッジはホーム画面に追加したWebアプリでしか動かない。iOS 26では、どのサイトでもWebアプリとしてホーム画面に追加できるようになった。
- **両OSで確実に使える機能**：位置情報、カメラ・マイク、モーションセンサー（iOSでは許可取得が必要）、共有シート、画面ロック防止、パスキー、決済、WebGPU。
- **いずれもHTTPSが必須**：多くの機能は、ユーザー操作（タップなど）をきっかけにしないと許可を求められない。
- **実装時は機能の有無を確認する**：`if ('bluetooth' in navigator)` のように、機能があるか確かめてから使う。最新の対応状況は Can I Use や MDN の互換性表で確認する。

---

## 3. iOSのWebで使えない機能は、ネイティブアプリなら実現できるか

### A. ネイティブなら実現できるもの

| Web側の機能 | ネイティブでの手段 | 補足 |
|---|---|---|
| 高精度センサー（加速度・ジャイロ・磁気） | Core Motion | 生データを高いサンプリングレートで取得でき、Webより自由度が高い |
| 振動 | Core Haptics / UIFeedbackGenerator | 細かい振動パターンも作れる |
| 画面の向き固定 | `supportedInterfaceOrientations` | 画面ごとに制御できる |
| 全画面表示 | 標準のUI | 制約なし |
| AR（WebXR） | ARKit / RealityKit | LiDAR・平面検出・顔トラッキングなど、Webより大幅に高機能 |
| バーコード読み取り | AVFoundation / Vision / VisionKit（DataScannerViewController） | |
| 連絡先の取得 | Contacts / CNContactPickerViewController | iOS 18以降は、ユーザーが選んだ連絡先だけを渡す「限定アクセス」がある |
| Bluetooth LE | Core Bluetooth | セントラル・ペリフェラルどちらにもなれる。バックグラウンドでの動作も可能（制約あり） |
| NFC（タグの読み書き） | Core NFC | NDEFタグの読み書き、FeliCa・MIFARE・ISO 7816タグへのアクセス |
| MIDI | Core MIDI | USBクラスコンプライアントのMIDI機器とBLE MIDIに対応 |
| バッテリー情報 | `UIDevice.batteryLevel` / `batteryState` | |
| ネットワーク情報 | NWPathMonitor | Wi-Fi・モバイル回線の区別や、従量課金回線・低データモードかどうかがわかる |
| プッシュ通知・バッジ | APNs / UserNotifications | ホーム画面に追加しなくても使える |
| ファイルアクセス | UIDocumentPicker / ファイルアプリ連携 | |
| 音声認識 | Speech / SpeechAnalyzer | 端末上での認識にも対応 |

### B. ネイティブでも制約が大きいもの

申請や契約、Appleによる審査が必要だったり、OSの判断に左右されたりして、Androidのように自由には使えないもの。

| 機能 | 状況 |
|---|---|
| バックグラウンド同期・定期実行 | BGTaskSchedulerで処理を予約できるが、実行するタイミングはOSが決めるため、時刻どおりの実行は保証されない。常にバックグラウンドで動かせるのは、位置情報・音声再生・BLE・VoIPなど用途が決められたものだけ |
| NFCのカード機能（AndroidのHCE相当） | NFC & SE Platformは、対象となる国・地域でAppleの許可（エンタイトルメント）と契約を得た事業者だけが使える。日本が対象かどうかは最新の規約で確認が必要 |
| 外部アクセサリとの専用接続 | External Accessory frameworkは、MFi認証を取ったアクセサリ専用 |
| 汎用USB機器（iPad） | DriverKitで独自のUSBドライバを作れるのは、M1以降のチップを搭載したiPadのみ。iPhoneは対象外 |
| HID機器 | ゲームコントローラー・キーボード・マウスはGameController frameworkで扱える。それ以外の汎用HID機器は、iPhoneでは直接通信できない |
| Wi-Fi情報（接続中のネットワーク名・周辺の電波一覧） | 接続中のネットワーク名（SSID）の取得には、位置情報の許可とエンタイトルメントが必要。周辺のWi-Fiを一覧取得するNEHotspotHelperは、Appleの個別承認がないと使えない |
| 近接センサー | `proximityMonitoring` で「近い／遠い」の2値しか取れない |

### C. ネイティブでも実質的に不可能なもの

| 機能 | 理由 |
|---|---|
| 照度センサーの値（ルクス） | センサーの値を取得する公開APIがない。カメラの露出値から推定する回避策はあるが、精度も用途も限られる |
| iPhoneでの汎用USB・有線シリアル通信（WebUSB／Web Serial相当） | iPhoneにはDriverKitがない。任意のUSB機器と直接通信するには、MFi認証品を使うか、Wi-Fi・BLE経由にするしかない |
| Bluetooth Classicのシリアル通信（SPP/RFCOMM） | Core BluetoothはBLE専用のため。Bluetooth ClassicはMFi認証のアクセサリでしか使えない |
| OS全体での無操作検出（Idle Detection相当） | 他のアプリや画面ロックの状態を知る手段がない。アプリ内での無操作検出は可能 |
| 自由な常時バックグラウンド動作 | Bで挙げた決められた用途以外では、OSの方針として認められていない |

### まとめ

- Webでは使えないがネイティブなら使える機能は多い（センサー、触覚フィードバック、AR、バーコード、BLE、NFC、プッシュ通知など）。これらが必要なら、ネイティブアプリにする意味は大きい。
- 汎用USB・シリアル・Bluetooth Classicで外部機器と通信したい場合は、ネイティブでも壁がある。iOSでは、BLEかWi-Fiで接続する機器を選ぶのが現実的。
- 中間的な選択肢として、WebView・Capacitor・React Nativeなどでアプリを包み、Aの機能だけをネイティブで橋渡しする方法がある。Webアプリのコードを活かしつつ、iOSで足りない機能を補える。

---

## 参考資料

- [WebKit Features in Safari 26.0 紹介（TechFeed）](https://techfeed.io/entries/68c88678d0e17253abf951b2)
- [News from WWDC25: WebKit in Safari 26 beta（WebKit Blog）](https://webkit.org/?p=16993)
- [Why the Four New Safari Features in iOS 26 Will Change How You Browse](https://ios.gadgethacks.com/news/why-the-four-new-safari-features-in-ios-26-will-change-how-you-browse/)
- [Safari in iOS 26（MacRumors）](https://www.macrumors.com/guide/ios-26-safari-features/)
- [web.dev: PWA capabilities](https://web.dev/learn/pwa/capabilities)
- [After Safari, Firefox Also Declines to Implement Web USB and other APIs](https://usefulangle.com/web-updates/post/80/firefox-decines-to-implement-web-usb-api)
- [Intent to Ship: Web serial over Bluetooth on Android（blink-dev）](https://groups.google.com/a/chromium.org/g/blink-dev/c/BqUGCcurReE/m/XbuAYkRxEQAJ)
- [Serial over Bluetooth（Chrome for Developers）](https://developer.chrome.com/blog/serial-over-bluetooth)
- [日本新法 非WebKitブラウザ（TechNews）](https://technews.tw/?p=1423939)
- [Japan orders Apple to open iOS to third-party browser engines（Mezha）](https://mezha.ua/en/news/apple-japan-alternative-ios-browsers-303899/)
- [WebBLE（App Store）](https://apps.apple.com/lt/app/ioswebble/id6761301368)

※ 3章（ネイティブ側の整理）は一般的なiOS SDKの知識に基づきます。エンタイトルメントの対象国や条件など変わりやすい部分は、Apple Developerの最新ドキュメントで確認してください。

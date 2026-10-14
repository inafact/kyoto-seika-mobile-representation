import type { Feature, Support } from '../lib/feature'
import { supportLabel } from '../lib/feature'
import { h } from '../lib/dom'
import { isAndroid, isIOS, platformName } from '../lib/platform'

interface Check {
  name: string
  api: string
  ios: Support
  android: Support
  detect: () => boolean
}

const nav = navigator as unknown as Record<string, unknown>
const win = window as unknown as Record<string, unknown>

/** 調査表（2 章）の全項目。期待値は mobile-web-device-capabilities-2026.md に準拠 */
const checks: Check[] = [
  { name: '位置情報', api: 'Geolocation', ios: 'yes', android: 'yes', detect: () => 'geolocation' in navigator },
  { name: 'カメラ・マイク', api: 'getUserMedia', ios: 'yes', android: 'yes', detect: () => !!navigator.mediaDevices?.getUserMedia },
  { name: '録画', api: 'MediaRecorder', ios: 'yes', android: 'yes', detect: () => 'MediaRecorder' in window },
  { name: 'モーション', api: 'DeviceMotionEvent', ios: 'partial', android: 'yes', detect: () => 'DeviceMotionEvent' in window },
  { name: '高精度センサー', api: 'Generic Sensor (Accelerometer)', ios: 'no', android: 'yes', detect: () => 'Accelerometer' in window },
  { name: '照度センサー', api: 'AmbientLightSensor', ios: 'no', android: 'no', detect: () => 'AmbientLightSensor' in window },
  { name: '振動', api: 'Vibration', ios: 'no', android: 'yes', detect: () => 'vibrate' in navigator },
  { name: '画面ロック防止', api: 'Screen Wake Lock', ios: 'yes', android: 'yes', detect: () => 'wakeLock' in navigator },
  {
    name: '画面の向き固定',
    api: 'screen.orientation.lock',
    ios: 'no',
    android: 'partial',
    detect: () => typeof (screen.orientation as unknown as { lock?: unknown })?.lock === 'function',
  },
  { name: '全画面表示', api: 'Fullscreen', ios: 'partial', android: 'yes', detect: () => !!document.fullscreenEnabled },
  { name: '通知', api: 'Notification', ios: 'partial', android: 'yes', detect: () => 'Notification' in window },
  { name: 'プッシュ', api: 'PushManager', ios: 'partial', android: 'yes', detect: () => 'PushManager' in window },
  { name: 'バッジ', api: 'Badging', ios: 'partial', android: 'partial', detect: () => 'setAppBadge' in navigator },
  { name: '共有シート', api: 'Web Share', ios: 'yes', android: 'yes', detect: () => 'share' in navigator },
  { name: 'パスキー', api: 'WebAuthn', ios: 'yes', android: 'yes', detect: () => 'PublicKeyCredential' in window },
  { name: '決済', api: 'Payment Request', ios: 'yes', android: 'yes', detect: () => 'PaymentRequest' in window },
  { name: 'デジタルID', api: 'Digital Credentials', ios: 'yes', android: 'yes', detect: () => 'DigitalCredential' in window },
  { name: 'WebGPU', api: 'navigator.gpu', ios: 'yes', android: 'yes', detect: () => 'gpu' in navigator },
  { name: 'WebGL2', api: 'WebGL2RenderingContext', ios: 'yes', android: 'yes', detect: () => 'WebGL2RenderingContext' in window },
  { name: 'AR', api: 'WebXR', ios: 'no', android: 'yes', detect: () => 'xr' in navigator },
  { name: '音声合成', api: 'speechSynthesis', ios: 'yes', android: 'yes', detect: () => 'speechSynthesis' in window },
  {
    name: '音声認識',
    api: 'SpeechRecognition',
    ios: 'partial',
    android: 'yes',
    detect: () => 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window,
  },
  { name: 'バーコード読み取り', api: 'BarcodeDetector', ios: 'no', android: 'yes', detect: () => 'BarcodeDetector' in window },
  { name: '連絡先の取得', api: 'Contact Picker', ios: 'no', android: 'yes', detect: () => 'contacts' in navigator && 'ContactsManager' in window },
  { name: 'Bluetooth', api: 'Web Bluetooth', ios: 'no', android: 'yes', detect: () => 'bluetooth' in navigator },
  { name: 'NFC', api: 'Web NFC', ios: 'no', android: 'yes', detect: () => 'NDEFReader' in window },
  { name: 'USB', api: 'WebUSB', ios: 'no', android: 'yes', detect: () => 'usb' in navigator },
  { name: 'シリアル通信', api: 'Web Serial', ios: 'no', android: 'partial', detect: () => 'serial' in navigator },
  { name: 'HID', api: 'WebHID', ios: 'no', android: 'partial', detect: () => 'hid' in navigator },
  { name: 'MIDI', api: 'Web MIDI', ios: 'no', android: 'partial', detect: () => typeof nav.requestMIDIAccess === 'function' },
  { name: 'バッテリー', api: 'Battery Status', ios: 'no', android: 'yes', detect: () => typeof nav.getBattery === 'function' },
  { name: 'ネットワーク情報', api: 'Network Information', ios: 'no', android: 'yes', detect: () => 'connection' in navigator },
  { name: 'バックグラウンド同期', api: 'Background Sync', ios: 'no', android: 'yes', detect: () => 'SyncManager' in window },
  { name: '定期バックグラウンド同期', api: 'Periodic Background Sync', ios: 'no', android: 'yes', detect: () => 'PeriodicSyncManager' in window },
  { name: 'ファイル保存', api: 'OPFS', ios: 'yes', android: 'yes', detect: () => typeof navigator.storage?.getDirectory === 'function' },
  { name: 'ファイル選択保存', api: 'File System Access (showOpenFilePicker)', ios: 'no', android: 'no', detect: () => 'showOpenFilePicker' in win },
]

export const checker: Feature = {
  id: 'checker',
  title: '対応状況チェッカー',
  api: '機能検出（feature detection）',
  support: { ios: 'yes', android: 'yes' },
  note: '調査表の全 API について、このブラウザで実際に存在するかを確認し、調査時点の期待値と並べて表示する。',
  render(root) {
    const expectedKey: 'ios' | 'android' | null = isIOS ? 'ios' : isAndroid ? 'android' : null
    let available = 0
    const rows = checks.map((c) => {
      let ok = false
      try {
        ok = c.detect()
      } catch {
        ok = false
      }
      if (ok) available++
      const expected = expectedKey ? c[expectedKey] : null
      // 期待値と検出結果が食い違う場合に強調（△は「条件付き」なのでどちらでも可）
      const mismatch = expected !== null && expected !== 'partial' && (expected === 'yes') !== ok
      return h(
        'tr',
        mismatch ? { style: 'background: color-mix(in srgb, var(--warn) 15%, transparent)' } : {},
        h('td', {}, c.name, h('div', { class: 'card-api' }, c.api)),
        h('td', { class: 'center' }, h('span', { class: `badge ${ok ? 'yes' : 'no'}` }, ok ? 'あり' : 'なし')),
        h('td', { class: 'center' }, supportLabel[c.ios]),
        h('td', { class: 'center' }, supportLabel[c.android]),
      )
    })

    root.append(
      h(
        'div',
        { class: 'panel' },
        h('p', {}, `この端末: ${platformName()} — ${checks.length} 項目中 ${available} 項目の API が存在します`),
        h('p', { class: 'muted' }, '「検出」は API の有無のみ。許可やインストールが必要な機能は、実際に使えるかを各デモページで確認してください。黄色の行は調査表の期待値と異なる項目です。'),
        h(
          'div',
          { class: 'table-wrap' },
          h(
            'table',
            {},
            h(
              'thead',
              {},
              h('tr', {}, h('th', {}, '機能 / API'), h('th', { class: 'center' }, '検出'), h('th', { class: 'center' }, 'iOS'), h('th', { class: 'center' }, 'Android')),
            ),
            h('tbody', {}, ...rows),
          ),
        ),
        h('p', { class: 'muted' }, '凡例（調査表）: ◎ 使える ／ △ 条件付き ／ × 使えない'),
      ),
    )
  },
}

import type { Feature } from '../lib/feature'
import { button, createKv, createLog, h, notice } from '../lib/dom'

/** iOS Safari のみに存在する静的メソッド */
type PermissionRequestable = { requestPermission?: () => Promise<'granted' | 'denied'> }

const fmt = (v: number | null | undefined, digits = 2) => (v === null || v === undefined ? null : v.toFixed(digits))

export const motion: Feature = {
  id: 'motion',
  title: '加速度・ジャイロ・方位',
  api: 'DeviceMotionEvent / DeviceOrientationEvent',
  support: { ios: 'partial', android: 'yes' },
  note: 'iOS ではユーザー操作をきっかけに requestPermission() を呼んで許可を得る必要がある。',
  render(root) {
    if (typeof DeviceMotionEvent === 'undefined' && typeof DeviceOrientationEvent === 'undefined') {
      root.append(notice('このブラウザはモーションセンサーに対応していません', 'error'))
      return
    }
    const log = createLog()
    const kv = createKv(['加速度 x', '加速度 y', '加速度 z', '回転 α', '回転 β', '回転 γ', '方位 alpha', '傾き beta', '傾き gamma', 'コンパス'])
    const ball = h('div', { class: 'motion-ball' })
    const stage = h('div', { class: 'motion-stage', 'aria-label': '端末を傾けるとボールが動きます' }, ball)
    let running = false

    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity
      const r = e.rotationRate
      kv.update({
        '加速度 x': fmt(a?.x),
        '加速度 y': fmt(a?.y),
        '加速度 z': fmt(a?.z),
        '回転 α': fmt(r?.alpha, 1),
        '回転 β': fmt(r?.beta, 1),
        '回転 γ': fmt(r?.gamma, 1),
      })
    }
    const onOrientation = (e: DeviceOrientationEvent) => {
      const compass = (e as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading
      kv.update({
        '方位 alpha': fmt(e.alpha, 1),
        '傾き beta': fmt(e.beta, 1),
        '傾き gamma': fmt(e.gamma, 1),
        コンパス: compass === undefined ? (e.absolute ? fmt(360 - (e.alpha ?? 0), 0) : null) : fmt(compass, 0),
      })
      // 傾き（-45°〜45°）をステージ上の位置に写像する
      const clamp = (v: number) => Math.max(-45, Math.min(45, v)) / 45
      const x = 50 + clamp(e.gamma ?? 0) * 45
      const y = 50 + clamp(e.beta ?? 0) * 45
      ball.style.left = `${x}%`
      ball.style.top = `${y}%`
    }

    const startListening = () => {
      window.addEventListener('devicemotion', onMotion)
      window.addEventListener('deviceorientation', onOrientation)
      running = true
      log.write('センサーの取得を開始しました（PC ではイベントが来ない場合があります）')
    }
    const stopListening = () => {
      window.removeEventListener('devicemotion', onMotion)
      window.removeEventListener('deviceorientation', onOrientation)
      running = false
    }

    const startBtn = button('センサー開始', async () => {
      if (running) {
        stopListening()
        startBtn.textContent = 'センサー開始'
        log.write('停止しました')
        return
      }
      // iOS: ボタンのタップ（ユーザー操作）内で許可を求める必要がある
      const M = DeviceMotionEvent as unknown as PermissionRequestable
      const O = DeviceOrientationEvent as unknown as PermissionRequestable
      try {
        if (typeof M.requestPermission === 'function') {
          const r1 = await M.requestPermission()
          const r2 = typeof O.requestPermission === 'function' ? await O.requestPermission() : 'granted'
          log.write(`requestPermission: motion=${r1}, orientation=${r2}`)
          if (r1 !== 'granted') return
        }
      } catch (err) {
        return log.write(err)
      }
      startListening()
      startBtn.textContent = 'センサー停止'
    })

    root.append(h('div', { class: 'panel' }, h('div', { class: 'row' }, startBtn), stage, kv.el), log.el)
    return stopListening
  },
}

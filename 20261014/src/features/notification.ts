import type { Feature } from '../lib/feature'
import { button, createLog, h, notice } from '../lib/dom'
import { isIOS, isStandalone } from '../lib/platform'

export const notification: Feature = {
  id: 'notification',
  title: '通知（ローカル）',
  api: 'Notifications API + ServiceWorkerRegistration.showNotification',
  support: { ios: 'partial', android: 'yes' },
  note: 'iOS はホーム画面に追加した Web アプリでのみ使える（16.4 以降）。このデモはサーバーを使わずに端末内で通知を出す。',
  render(root) {
    const log = createLog()
    const status = h('p', {})
    const refresh = () => {
      status.textContent = `通知の許可状態: ${'Notification' in window ? Notification.permission : '非対応'}`
    }

    if (!('Notification' in window)) {
      root.append(
        notice(
          isIOS && !isStandalone()
            ? 'iOS ではホーム画面に追加して起動した場合のみ通知が使えます。Safari の共有メニューから「ホーム画面に追加」してください。'
            : 'このブラウザは Notifications API に対応していません',
          'error',
        ),
      )
      return
    }

    const show = async (delaySec: number) => {
      if (Notification.permission !== 'granted') return log.write('先に通知を許可してください')
      const reg = await navigator.serviceWorker?.ready
      if (!reg) return log.write('Service Worker が登録されていません')
      const fire = () =>
        reg
          .showNotification('PWA デモからの通知', {
            body: `${new Date().toLocaleTimeString('ja-JP')} に送信しました。タップするとアプリを開きます。`,
            icon: '/pwa-192x192.png',
            badge: '/pwa-64x64.png',
            tag: 'demo',
            data: { url: '/#/notification' },
          })
          .then(() => log.write('通知を表示しました'))
          .catch(log.write)
      if (delaySec > 0) {
        log.write(`${delaySec} 秒後に通知します（アプリを閉じずにホームへ戻って確認できます）`)
        setTimeout(fire, delaySec * 1000)
      } else {
        await fire()
      }
    }

    root.append(
      ...(isIOS && !isStandalone() ? [notice('iOS ではホーム画面から起動した場合のみ通知が届きます。')] : []),
      h(
        'div',
        { class: 'panel' },
        status,
        h(
          'div',
          { class: 'row' },
          button('通知を許可', async () => {
            // iOS ではユーザー操作内で呼ぶ必要がある
            const result = await Notification.requestPermission()
            log.write(`requestPermission: ${result}`)
            refresh()
          }),
          button('今すぐ通知', () => show(0), 'secondary'),
          button('5 秒後に通知', () => show(5), 'secondary'),
        ),
        h('p', { class: 'muted' }, 'リモートプッシュ（Web Push）は送信サーバーが必要なため、このデモには含めていません。'),
      ),
      log.el,
    )
    refresh()
  },
}

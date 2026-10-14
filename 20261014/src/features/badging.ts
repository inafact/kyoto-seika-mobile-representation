import type { Feature } from '../lib/feature'
import { button, createLog, h, notice } from '../lib/dom'
import { isStandalone } from '../lib/platform'

export const badging: Feature = {
  id: 'badging',
  title: 'アプリアイコンのバッジ',
  api: 'Badging API (setAppBadge)',
  support: { ios: 'partial', android: 'partial' },
  note: 'どちらもインストール済み PWA が前提。iOS は通知の許可も必要。',
  render(root) {
    if (!('setAppBadge' in navigator)) {
      root.append(notice('このブラウザは Badging API に対応していません（インストール後に再確認してください）', 'error'))
      return
    }
    const log = createLog()
    const count = h('p', {}, 'バッジ: 0')
    let n = 0
    const apply = async () => {
      try {
        if (n > 0) await navigator.setAppBadge(n)
        else await navigator.clearAppBadge()
        count.textContent = `バッジ: ${n}`
        log.write(n > 0 ? `setAppBadge(${n})` : 'clearAppBadge()')
      } catch (err) {
        log.write(err)
      }
    }

    root.append(
      ...(isStandalone() ? [] : [notice('ホーム画面に追加したアプリから開くと、アイコンにバッジが表示されます。')]),
      h(
        'div',
        { class: 'panel' },
        count,
        h(
          'div',
          { class: 'row' },
          button('+1', () => {
            n++
            return apply()
          }),
          button('-1', () => {
            n = Math.max(0, n - 1)
            return apply()
          }, 'secondary'),
          button('クリア', () => {
            n = 0
            return apply()
          }, 'secondary'),
          button('通知を許可（iOS 用）', async () => {
            if ('Notification' in window) log.write(`requestPermission: ${await Notification.requestPermission()}`)
            else log.write('Notification API がありません')
          }, 'secondary'),
        ),
        h('p', { class: 'muted' }, '設定後にホーム画面へ戻り、アプリアイコンを確認してください。'),
      ),
      log.el,
    )
  },
}

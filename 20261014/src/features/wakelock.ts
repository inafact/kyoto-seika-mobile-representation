import type { Feature } from '../lib/feature'
import { button, createLog, h, notice } from '../lib/dom'

export const wakelock: Feature = {
  id: 'wakelock',
  title: '画面ロック防止',
  api: 'Screen Wake Lock API',
  support: { ios: 'yes', android: 'yes' },
  note: 'タブが非表示になると自動で解放されるため、visibilitychange で再取得する。',
  render(root) {
    if (!('wakeLock' in navigator)) {
      root.append(notice('このブラウザは Screen Wake Lock API に対応していません', 'error'))
      return
    }
    const log = createLog()
    const state = h('p', {}, '状態: 解放中')
    let sentinel: WakeLockSentinel | null = null
    let wanted = false

    const acquire = async () => {
      try {
        sentinel = await navigator.wakeLock.request('screen')
        state.textContent = '状態: 画面ロック防止中 🔆'
        sentinel.addEventListener('release', () => {
          state.textContent = '状態: 解放中'
          log.write('Wake Lock が解放されました')
        })
        log.write('Wake Lock を取得しました')
      } catch (err) {
        log.write(err)
      }
    }

    const toggle = button('画面ロック防止 ON', async () => {
      if (wanted) {
        wanted = false
        await sentinel?.release()
        sentinel = null
        toggle.textContent = '画面ロック防止 ON'
      } else {
        wanted = true
        await acquire()
        toggle.textContent = '画面ロック防止 OFF'
      }
    })

    const onVisible = () => {
      if (wanted && document.visibilityState === 'visible' && (!sentinel || sentinel.released)) {
        log.write('タブ復帰: 再取得します')
        void acquire()
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    root.append(
      h(
        'div',
        { class: 'panel' },
        h('div', { class: 'row' }, toggle),
        state,
        h('p', { class: 'muted' }, 'ON にしたまま放置して、画面が消えないことを確認してください。'),
      ),
      log.el,
    )
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      void sentinel?.release()
    }
  },
}

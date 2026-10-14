import type { Feature } from '../lib/feature'
import { button, createLog, h, notice } from '../lib/dom'

/** 共有用のサンプル画像を canvas で生成する */
async function createSampleImage(): Promise<File> {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 600
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createLinearGradient(0, 0, 600, 600)
  grad.addColorStop(0, '#1f6feb')
  grad.addColorStop(1, '#8957e5')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 600, 600)
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 48px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('PWA デモ', 300, 280)
  ctx.font = '28px system-ui, sans-serif'
  ctx.fillText(new Date().toLocaleString('ja-JP'), 300, 340)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  return new File([blob!], 'pwa-demo.png', { type: 'image/png' })
}

export const share: Feature = {
  id: 'share',
  title: '共有シート',
  api: 'Web Share API',
  support: { ios: 'yes', android: 'yes' },
  note: 'OS 標準の共有シートを開く。ファイル共有は canShare({ files }) で可否を確認する。',
  render(root) {
    if (!('share' in navigator)) {
      root.append(notice('このブラウザは Web Share API に対応していません（PC の一部ブラウザなど）', 'error'))
      return
    }
    const log = createLog()
    const text = h('input', { type: 'text', class: 'text', value: 'iOS と Android で動く PWA デモ', 'aria-label': '共有するテキスト' })

    const run = async (data: ShareData) => {
      try {
        await navigator.share(data)
        log.write('共有しました')
      } catch (err) {
        // ユーザーがキャンセルした場合は AbortError
        log.write(err)
      }
    }

    root.append(
      h(
        'div',
        { class: 'panel' },
        text,
        h(
          'div',
          { class: 'row' },
          button('テキストと URL を共有', () => run({ title: document.title, text: text.value, url: location.origin })),
          button('画像ファイルを共有', async () => {
            if (!file) return log.write('画像を準備中です')
            if (!navigator.canShare?.({ files: [file] })) return log.write('ファイル共有に対応していません')
            await run({ files: [file], title: 'PWA デモ画像' })
          }, 'secondary'),
        ),
      ),
      log.el,
    )
    // iOS はタップ直後（ユーザー操作中）に share() を呼ぶ必要があるため、画像は事前に用意しておく
    let file: File | null = null
    void createSampleImage().then((f) => (file = f))
  },
}

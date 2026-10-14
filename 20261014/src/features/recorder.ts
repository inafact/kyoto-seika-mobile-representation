import type { Feature } from '../lib/feature'
import { button, createLog, h, notice } from '../lib/dom'

/** iOS Safari は mp4、Android Chrome は webm（最近は mp4 も可）を優先して選ぶ */
const candidates = {
  audio: ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'],
  video: ['video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'],
}

function pickMimeType(kind: 'audio' | 'video'): string {
  return candidates[kind].find((t) => MediaRecorder.isTypeSupported(t)) ?? ''
}

export const recorder: Feature = {
  id: 'recorder',
  title: '録音・録画',
  api: 'getUserMedia + MediaRecorder',
  support: { ios: 'yes', android: 'yes' },
  note: 'マイク・カメラの許可が必要。対応コンテナ形式は OS ごとに異なるため isTypeSupported で選択する。',
  render(root) {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      root.append(notice('このブラウザは MediaRecorder に対応していません', 'error'))
      return
    }
    const log = createLog()
    const kindSelect = h(
      'select',
      { 'aria-label': '録音/録画の種類' },
      h('option', { value: 'audio' }, '音声のみ'),
      h('option', { value: 'video' }, '音声 + 映像'),
    )
    const preview = h('video', { playsinline: true, muted: true, autoplay: true, hidden: true })
    const result = h('div', {})
    let stream: MediaStream | null = null
    let rec: MediaRecorder | null = null
    let resultUrl = ''

    const recordBtn = button('録音開始', async () => {
      if (rec && rec.state === 'recording') {
        rec.stop()
        return
      }
      const kind = kindSelect.value as 'audio' | 'video'
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: kind === 'video' })
      } catch (err) {
        return log.write(err)
      }
      if (kind === 'video') {
        preview.srcObject = stream
        preview.hidden = false
      }
      const mimeType = pickMimeType(kind)
      rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      const chunks: Blob[] = []
      rec.addEventListener('dataavailable', (e) => e.data.size && chunks.push(e.data))
      rec.addEventListener('stop', () => {
        stream?.getTracks().forEach((t) => t.stop())
        preview.hidden = true
        preview.srcObject = null
        const type = rec?.mimeType || mimeType || chunks[0]?.type
        const blob = new Blob(chunks, { type })
        if (resultUrl) URL.revokeObjectURL(resultUrl)
        resultUrl = URL.createObjectURL(blob)
        const ext = type.includes('mp4') ? (kind === 'audio' ? 'm4a' : 'mp4') : 'webm'
        const player =
          kind === 'audio'
            ? h('audio', { controls: true, src: resultUrl })
            : h('video', { controls: true, playsinline: true, src: resultUrl })
        result.replaceChildren(
          player,
          h('div', { class: 'row' }, h('a', { href: resultUrl, download: `recording.${ext}` }, 'ダウンロード')),
        )
        log.write(`録画完了: ${type} ${(blob.size / 1024).toFixed(0)} KB`)
        recordBtn.textContent = '録音開始'
        kindSelect.disabled = false
      })
      rec.start(250)
      recordBtn.textContent = '停止'
      kindSelect.disabled = true
      log.write(`録画開始: ${rec.mimeType || '(既定の形式)'}`)
    })

    root.append(
      h(
        'div',
        { class: 'panel' },
        h('div', { class: 'row' }, kindSelect, recordBtn),
        preview,
        result,
      ),
      log.el,
    )
    return () => {
      if (rec?.state === 'recording') rec.stop()
      stream?.getTracks().forEach((t) => t.stop())
      if (resultUrl) URL.revokeObjectURL(resultUrl)
    }
  },
}

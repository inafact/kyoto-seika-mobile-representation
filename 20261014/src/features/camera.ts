import type { Feature } from '../lib/feature'
import { button, createLog, h, notice } from '../lib/dom'

/** torch / zoom は標準の型定義に含まれないため拡張する（Android Chrome のみ対応） */
type ExtCapabilities = MediaTrackCapabilities & { torch?: boolean; zoom?: { min: number; max: number; step: number } }
type ExtConstraintSet = MediaTrackConstraintSet & { torch?: boolean; zoom?: number }

export const camera: Feature = {
  id: 'camera',
  title: 'カメラ',
  api: 'getUserMedia',
  support: { ios: 'yes', android: 'yes' },
  note: '前面・背面カメラを選べる。ズームやライトなどの制御は Android の方が細かくできる。',
  render(root) {
    if (!navigator.mediaDevices?.getUserMedia) {
      root.append(notice('このブラウザは getUserMedia に対応していません（HTTPS が必要です）', 'error'))
      return
    }
    const log = createLog()
    const video = h('video', { playsinline: true, muted: true, autoplay: true })
    const photo = h('img', { class: 'preview', alt: '撮影した写真', hidden: true })
    const controls = h('div', { class: 'row' })
    let stream: MediaStream | null = null
    let facing: 'user' | 'environment' = 'environment'
    let lastBlob: Blob | null = null

    const stop = () => {
      stream?.getTracks().forEach((t) => t.stop())
      stream = null
      video.srcObject = null
      controls.replaceChildren()
    }

    const start = async () => {
      stop()
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
        video.srcObject = stream
        const track = stream.getVideoTracks()[0]
        const s = track.getSettings()
        log.write(`起動: ${track.label || 'camera'} ${s.width}×${s.height} (${facing})`)
        buildAdvancedControls(track)
      } catch (err) {
        log.write(err)
      }
    }

    /** ライト・ズームは端末がサポートを報告した場合のみ表示 */
    const buildAdvancedControls = (track: MediaStreamTrack) => {
      const caps = (track.getCapabilities?.() ?? {}) as ExtCapabilities
      if (caps.torch) {
        let on = false
        controls.append(
          button('ライト切替', async () => {
            on = !on
            await track.applyConstraints({ advanced: [{ torch: on } as ExtConstraintSet] }).catch(log.write)
          }, 'secondary'),
        )
      }
      if (caps.zoom) {
        const range = h('input', {
          type: 'range',
          min: String(caps.zoom.min),
          max: String(caps.zoom.max),
          step: String(caps.zoom.step),
          value: String(caps.zoom.min),
          'aria-label': 'ズーム',
        })
        range.addEventListener('input', () => {
          void track.applyConstraints({ advanced: [{ zoom: Number(range.value) } as ExtConstraintSet] })
        })
        controls.append(h('label', {}, 'ズーム '), range)
      }
      if (!caps.torch && !caps.zoom) {
        controls.append(h('span', { class: 'muted' }, 'この端末/ブラウザではライト・ズーム制御は利用できません'))
      }
    }

    const capture = () => {
      if (!stream) return log.write('先にカメラを起動してください')
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext('2d')?.drawImage(video, 0, 0)
      canvas.toBlob((blob) => {
        if (!blob) return
        lastBlob = blob
        if (photo.src) URL.revokeObjectURL(photo.src)
        photo.src = URL.createObjectURL(blob)
        photo.hidden = false
        log.write(`撮影: ${canvas.width}×${canvas.height} ${(blob.size / 1024).toFixed(0)} KB`)
      }, 'image/jpeg', 0.9)
    }

    const share = async () => {
      if (!lastBlob) return log.write('先に撮影してください')
      const file = new File([lastBlob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' })
      if (!navigator.canShare?.({ files: [file] })) return log.write('このブラウザはファイル共有に対応していません')
      await navigator.share({ files: [file], title: 'PWA デモで撮影' }).catch(log.write)
    }

    root.append(
      h(
        'div',
        { class: 'panel' },
        h(
          'div',
          { class: 'row' },
          button('カメラ起動', start),
          button('前面/背面 切替', () => {
            facing = facing === 'user' ? 'environment' : 'user'
            return start()
          }, 'secondary'),
          button('停止', stop, 'secondary'),
        ),
        video,
        controls,
        h('div', { class: 'row' }, button('撮影', capture), button('写真を共有', share, 'secondary')),
        photo,
      ),
      log.el,
    )
    return () => {
      stop()
      if (photo.src) URL.revokeObjectURL(photo.src)
    }
  },
}

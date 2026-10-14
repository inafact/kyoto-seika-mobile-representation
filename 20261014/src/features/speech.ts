import type { Feature } from '../lib/feature'
import { button, createLog, h, notice } from '../lib/dom'

/** SpeechRecognition は TypeScript の DOM 型に含まれないため最小限を定義 */
interface RecognitionResultEvent extends Event {
  resultIndex: number
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string; confidence: number } }>
}
interface Recognition extends EventTarget {
  lang: string
  interimResults: boolean
  continuous: boolean
  start(): void
  stop(): void
  onresult: ((e: RecognitionResultEvent) => void) | null
  onerror: ((e: Event & { error: string }) => void) | null
  onend: (() => void) | null
}
type RecognitionCtor = new () => Recognition

const RecognitionImpl: RecognitionCtor | undefined =
  (window as unknown as { SpeechRecognition?: RecognitionCtor }).SpeechRecognition ??
  (window as unknown as { webkitSpeechRecognition?: RecognitionCtor }).webkitSpeechRecognition

export const speech: Feature = {
  id: 'speech',
  title: '音声合成・音声認識',
  api: 'Web Speech API',
  support: { ios: 'partial', android: 'yes' },
  note: '読み上げは両 OS で利用可。音声認識は iOS ではプレフィックス付きで、精度や継続認識に差がある。',
  render(root) {
    const log = createLog()
    let loadVoices: (() => void) | null = null

    // --- 音声合成 ---
    const synthPanel = h('div', { class: 'panel' }, h('h2', {}, '読み上げ（speechSynthesis）'))
    if ('speechSynthesis' in window) {
      const text = h('textarea', { 'aria-label': '読み上げるテキスト' }, 'こんにちは。これは PWA のデモアプリです。')
      const voiceSelect = h('select', { 'aria-label': '音声' })
      loadVoices = () => {
        const voices = speechSynthesis.getVoices().filter((v) => v.lang.startsWith('ja'))
        voiceSelect.replaceChildren(...voices.map((v) => h('option', { value: v.name }, `${v.name} (${v.lang})`)))
      }
      loadVoices()
      speechSynthesis.addEventListener('voiceschanged', loadVoices)
      synthPanel.append(
        text,
        h('div', { class: 'row' }, voiceSelect),
        h(
          'div',
          { class: 'row' },
          button('読み上げ', () => {
            speechSynthesis.cancel()
            const u = new SpeechSynthesisUtterance(text.value)
            u.lang = 'ja-JP'
            const voice = speechSynthesis.getVoices().find((v) => v.name === voiceSelect.value)
            if (voice) u.voice = voice
            u.onend = () => log.write('読み上げ終了')
            speechSynthesis.speak(u)
          }),
          button('停止', () => speechSynthesis.cancel(), 'secondary'),
        ),
      )
    } else {
      synthPanel.append(notice('speechSynthesis に対応していません', 'error'))
    }

    // --- 音声認識 ---
    const recogPanel = h('div', { class: 'panel' }, h('h2', {}, '音声認識（SpeechRecognition）'))
    let recognition: Recognition | null = null
    if (RecognitionImpl) {
      const output = h('p', {}, '')
      const interim = h('p', { class: 'muted' }, '')
      const startBtn = button('認識開始', () => {
        if (recognition) {
          recognition.stop()
          return
        }
        recognition = new RecognitionImpl()
        recognition.lang = 'ja-JP'
        recognition.interimResults = true
        recognition.continuous = true
        recognition.onresult = (e) => {
          let partial = ''
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const r = e.results[i]
            if (r.isFinal) output.textContent += r[0].transcript
            else partial += r[0].transcript
          }
          interim.textContent = partial
        }
        recognition.onerror = (e) => log.write(`エラー: ${e.error}`)
        recognition.onend = () => {
          recognition = null
          startBtn.textContent = '認識開始'
          log.write('認識終了')
        }
        recognition.start()
        startBtn.textContent = '認識停止'
        log.write('認識開始（話しかけてください）')
      })
      recogPanel.append(
        h('div', { class: 'row' }, startBtn, button('クリア', () => (output.textContent = ''), 'secondary')),
        output,
        interim,
      )
    } else {
      recogPanel.append(notice('SpeechRecognition に対応していません', 'error'))
    }

    root.append(synthPanel, recogPanel, log.el)
    return () => {
      recognition?.stop()
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel()
        if (loadVoices) speechSynthesis.removeEventListener('voiceschanged', loadVoices)
      }
    }
  },
}

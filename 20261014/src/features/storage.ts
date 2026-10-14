import type { Feature } from '../lib/feature'
import { button, createKv, createLog, h, notice } from '../lib/dom'

const FILE_NAME = 'memo.txt'

const formatBytes = (n?: number) => {
  if (n === undefined) return null
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return `${n.toFixed(1)} ${units[i]}`
}

function writeInWorker(text: string): Promise<void> {
  const worker = new Worker(new URL('../workers/opfs-writer.ts', import.meta.url), { type: 'module' })
  return new Promise<void>((resolve, reject) => {
    worker.onmessage = (e: MessageEvent<{ ok: boolean; error?: string }>) => {
      worker.terminate()
      if (e.data.ok) resolve()
      else reject(new Error(e.data.error))
    }
    worker.onerror = (e) => {
      worker.terminate()
      reject(new Error(e.message))
    }
    worker.postMessage({ name: FILE_NAME, text })
  })
}

export const storage: Feature = {
  id: 'storage',
  title: 'ファイル保存・オフライン',
  api: 'OPFS (Origin Private File System) / StorageManager / Service Worker',
  support: { ios: 'yes', android: 'yes' },
  note: 'ブラウザ内の専用領域に保存。端末のファイルを直接選んで読み書きする機能はモバイルではほぼ使えない。',
  render(root) {
    if (!navigator.storage?.getDirectory) {
      root.append(notice('このブラウザは OPFS に対応していません', 'error'))
      return
    }
    const log = createLog()
    const memo = h('textarea', { 'aria-label': 'メモ', placeholder: 'ここに書いた内容を OPFS に保存します' })
    const kv = createKv(['使用量', '割り当て', '永続化', 'オンライン状態'])

    const refresh = async () => {
      const est = await navigator.storage.estimate()
      const persisted = await navigator.storage.persisted?.()
      kv.update({
        使用量: formatBytes(est.usage),
        割り当て: formatBytes(est.quota),
        永続化: persisted ? '有効' : '無効（容量逼迫時に削除される可能性あり）',
        オンライン状態: navigator.onLine ? 'オンライン' : 'オフライン',
      })
    }

    const save = async () => {
      try {
        const dir = await navigator.storage.getDirectory()
        const handle = await dir.getFileHandle(FILE_NAME, { create: true })
        if ('createWritable' in handle) {
          const w = await handle.createWritable()
          await w.write(memo.value)
          await w.close()
        } else {
          // createWritable が無い古い Safari では、Worker 内の同期アクセスハンドルで書き込む
          await writeInWorker(memo.value)
        }
        log.write(`保存しました（${new Blob([memo.value]).size} bytes）`)
        await refresh()
      } catch (err) {
        log.write(err)
      }
    }

    const load = async () => {
      try {
        const dir = await navigator.storage.getDirectory()
        const handle = await dir.getFileHandle(FILE_NAME)
        memo.value = await (await handle.getFile()).text()
        log.write('読み込みました')
      } catch (err) {
        log.write(err instanceof DOMException && err.name === 'NotFoundError' ? 'まだ保存されていません' : err)
      }
    }

    const onConn = () => void refresh()
    window.addEventListener('online', onConn)
    window.addEventListener('offline', onConn)

    root.append(
      h(
        'div',
        { class: 'panel' },
        h('h2', {}, 'OPFS メモ'),
        memo,
        h(
          'div',
          { class: 'row' },
          button('保存', save),
          button('読み込み', load, 'secondary'),
          button('永続化をリクエスト', async () => {
            log.write(`persist(): ${await navigator.storage.persist()}`)
            await refresh()
          }, 'secondary'),
        ),
      ),
      h(
        'div',
        { class: 'panel' },
        h('h2', {}, 'ストレージとオフライン'),
        kv.el,
        h(
          'p',
          { class: 'muted' },
          'このアプリは Service Worker で全ファイルをキャッシュしています。機内モードにして再読み込みしても動作します。',
        ),
      ),
      log.el,
    )
    void refresh()
    void load()
    return () => {
      window.removeEventListener('online', onConn)
      window.removeEventListener('offline', onConn)
    }
  },
}

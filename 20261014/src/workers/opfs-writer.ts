/// <reference lib="webworker" />
// OPFS の同期アクセスハンドルは Worker 内でのみ使える

self.onmessage = async (e: MessageEvent<{ name: string; text: string }>) => {
  try {
    const dir = await navigator.storage.getDirectory()
    const handle = await dir.getFileHandle(e.data.name, { create: true })
    const access = await handle.createSyncAccessHandle()
    const bytes = new TextEncoder().encode(e.data.text)
    access.truncate(0)
    access.write(bytes, { at: 0 })
    access.flush()
    access.close()
    self.postMessage({ ok: true })
  } catch (err) {
    self.postMessage({ ok: false, error: err instanceof Error ? err.message : String(err) })
  }
}

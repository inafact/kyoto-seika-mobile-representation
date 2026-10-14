/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare let self: ServiceWorkerGlobalScope

// ビルド時に vite-plugin-pwa がファイル一覧を埋め込む
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// SPA のため、すべてのナビゲーションをキャッシュ済みの index.html で応答（オフライン対応）
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

// 更新バナーの「更新」ボタンから送られる
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting()
})

// 通知タップでアプリを前面に出す（開いていなければ新規に開く）
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL((event.notification.data?.url as string | undefined) ?? '/', self.location.origin).href
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const existing = windows.find((c) => new URL(c.url).origin === self.location.origin)
      if (existing) {
        await existing.focus()
        await existing.navigate(url).catch(() => undefined)
      } else {
        await self.clients.openWindow(url)
      }
    })(),
  )
})

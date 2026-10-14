const ua = navigator.userAgent

/** iPadOS は Mac と同じ UA を返すため、タッチ対応で判別する */
export const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
export const isAndroid = /Android/.test(ua)

/** ホーム画面から起動された（インストール済み PWA として動作中）か */
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function platformName(): string {
  if (isIOS) return 'iOS / iPadOS'
  if (isAndroid) return 'Android'
  return 'その他（PC など）'
}

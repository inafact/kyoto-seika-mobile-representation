import type { Feature } from '../lib/feature'
import { button, createKv, createLog, h, notice } from '../lib/dom'

const errorNames: Record<number, string> = {
  1: '許可されませんでした (PERMISSION_DENIED)',
  2: '位置を取得できません (POSITION_UNAVAILABLE)',
  3: 'タイムアウト (TIMEOUT)',
}

export const geolocation: Feature = {
  id: 'geolocation',
  title: '位置情報',
  api: 'Geolocation API',
  support: { ios: 'yes', android: 'yes' },
  note: 'HTTPS と許可が必要。ページを開いている間だけ取得でき、バックグラウンドでは取得不可。',
  render(root) {
    if (!('geolocation' in navigator)) {
      root.append(notice('このブラウザは Geolocation API に対応していません', 'error'))
      return
    }
    const log = createLog()
    const kv = createKv(['緯度', '経度', '精度', '高度', '速度', '方角', '取得時刻'])
    const mapLink = h('a', { target: '_blank', rel: 'noopener' }, '')
    let watchId: number | null = null

    const show = (pos: GeolocationPosition) => {
      const c = pos.coords
      kv.update({
        緯度: c.latitude.toFixed(6),
        経度: c.longitude.toFixed(6),
        精度: `±${Math.round(c.accuracy)} m`,
        高度: c.altitude === null ? null : `${c.altitude.toFixed(1)} m`,
        速度: c.speed === null ? null : `${(c.speed * 3.6).toFixed(1)} km/h`,
        方角: c.heading === null || Number.isNaN(c.heading) ? null : `${Math.round(c.heading)}°`,
        取得時刻: new Date(pos.timestamp).toLocaleTimeString('ja-JP'),
      })
      mapLink.href = `https://www.openstreetmap.org/?mlat=${c.latitude}&mlon=${c.longitude}#map=17/${c.latitude}/${c.longitude}`
      mapLink.textContent = 'OpenStreetMap で開く'
    }
    const fail = (err: GeolocationPositionError) => log.write(errorNames[err.code] ?? err.message)
    const options: PositionOptions = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }

    const watchBtn = button('追跡開始', () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId)
        watchId = null
        watchBtn.textContent = '追跡開始'
        log.write('追跡を停止しました')
        return
      }
      watchId = navigator.geolocation.watchPosition(show, fail, options)
      watchBtn.textContent = '追跡停止'
      log.write('watchPosition を開始しました')
    }, 'secondary')

    root.append(
      h(
        'div',
        { class: 'panel' },
        h(
          'div',
          { class: 'row' },
          button('現在地を取得', () => {
            log.write('取得中…')
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                show(pos)
                log.write('取得しました')
              },
              fail,
              options,
            )
          }),
          watchBtn,
        ),
        kv.el,
        mapLink,
      ),
      log.el,
    )
    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId)
    }
  },
}

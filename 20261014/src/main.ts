import './styles.css'
import { registerSW } from 'virtual:pwa-register'
import { features } from './features'
import { type Feature, type Support, supportLabel } from './lib/feature'
import { h } from './lib/dom'
import { isStandalone, platformName } from './lib/platform'

const app = document.querySelector<HTMLElement>('#app')!
const status = document.querySelector<HTMLElement>('#status')!
let cleanup: (() => void) | void

function supportBadge(os: string, s: Support): HTMLElement {
  return h('span', { class: `badge ${s}` }, `${os} ${supportLabel[s]}`)
}

function renderHome(): void {
  document.title = 'PWA デバイス機能デモ'
  app.append(
    h('h1', {}, 'Web から使えるデバイス機能'),
    h(
      'p',
      { class: 'muted' },
      'iOS Safari と Android Chrome の最新版で動く機能を中心に集めたデモです。各カードの記号は調査時点（2026年10月）の対応状況です。',
    ),
    h(
      'div',
      { class: 'grid' },
      ...features.map((f) =>
        h(
          'a',
          { class: 'card', href: `#/${f.id}` },
          h('div', { class: 'card-title' }, f.title),
          h('div', { class: 'card-api' }, f.api),
          h('div', { class: 'badges' }, supportBadge('iOS', f.support.ios), supportBadge('Android', f.support.android)),
        ),
      ),
    ),
  )
}

function renderFeature(f: Feature): void {
  document.title = `${f.title} | PWA デモ`
  const body = h('div', {})
  app.append(
    h('p', {}, h('a', { href: '#/' }, '← 一覧へ戻る')),
    h('h1', {}, f.title),
    h('div', { class: 'card-api' }, f.api),
    h('div', { class: 'badges' }, supportBadge('iOS', f.support.ios), supportBadge('Android', f.support.android)),
    h('p', { class: 'muted' }, f.note),
    body,
  )
  cleanup = f.render(body)
}

function route(): void {
  cleanup?.()
  cleanup = undefined
  app.replaceChildren()
  const id = location.hash.replace(/^#\/?/, '')
  const feature = features.find((f) => f.id === id)
  if (feature) renderFeature(feature)
  else renderHome()
  window.scrollTo(0, 0)
}

function updateStatus(): void {
  status.textContent = `${platformName()} · ${isStandalone() ? 'アプリ' : 'ブラウザ'} · ${navigator.onLine ? 'オンライン' : 'オフライン'}`
}

window.addEventListener('hashchange', route)
window.addEventListener('online', updateStatus)
window.addEventListener('offline', updateStatus)
route()
updateStatus()

// Service Worker 登録。新しいバージョンが見つかったら更新バナーを出す
const banner = document.querySelector<HTMLElement>('#update-banner')!
const updateSW = registerSW({
  onNeedRefresh() {
    banner.hidden = false
  },
  onOfflineReady() {
    console.info('オフラインで利用できる準備ができました')
  },
})
document.querySelector('#update-reload')!.addEventListener('click', () => void updateSW(true))

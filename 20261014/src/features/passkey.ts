import type { Feature } from '../lib/feature'
import { button, createLog, h, notice } from '../lib/dom'

const STORAGE_KEY = 'pwa-demo-passkey-ids'

const toB64url = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
const fromB64url = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
const randomBytes = (n: number) => crypto.getRandomValues(new Uint8Array(n))

function loadIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

export const passkey: Feature = {
  id: 'passkey',
  title: '生体認証・パスキー',
  api: 'WebAuthn (PublicKeyCredential)',
  support: { ios: 'yes', android: 'yes' },
  note: 'Face ID・Touch ID・指紋認証を使える。本デモはサーバー検証を省いたクライアントのみの動作確認。',
  render(root) {
    if (!('PublicKeyCredential' in window)) {
      root.append(notice('このブラウザは WebAuthn に対応していません', 'error'))
      return
    }
    const log = createLog()
    const ids = h('p', { class: 'muted' })
    const refreshIds = () => {
      ids.textContent = `この端末で登録したパスキー: ${loadIds().length} 件`
    }

    const register = async () => {
      try {
        const cred = (await navigator.credentials.create({
          publicKey: {
            // 実運用ではサーバーが発行した challenge を使い、応答をサーバーで検証する
            challenge: randomBytes(32),
            rp: { name: 'PWA デバイス機能デモ', id: location.hostname },
            user: { id: randomBytes(16), name: `demo-${Date.now()}`, displayName: 'PWA デモユーザー' },
            pubKeyCredParams: [
              { type: 'public-key', alg: -7 },
              { type: 'public-key', alg: -257 },
            ],
            authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
            timeout: 60000,
          },
        })) as PublicKeyCredential | null
        if (!cred) return log.write('キャンセルされました')
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...loadIds(), cred.id]))
        const attachment = cred.authenticatorAttachment ?? '不明'
        log.write(`登録成功: id=${cred.id.slice(0, 16)}… attachment=${attachment}`)
        refreshIds()
      } catch (err) {
        log.write(err)
      }
    }

    const authenticate = async () => {
      try {
        const cred = (await navigator.credentials.get({
          publicKey: {
            challenge: randomBytes(32),
            rpId: location.hostname,
            allowCredentials: loadIds().map((id) => ({ type: 'public-key' as const, id: fromB64url(id) })),
            userVerification: 'required',
            timeout: 60000,
          },
        })) as PublicKeyCredential | null
        if (!cred) return log.write('キャンセルされました')
        const res = cred.response as AuthenticatorAssertionResponse
        log.write(`認証成功: id=${cred.id.slice(0, 16)}… signature=${toB64url(res.signature).slice(0, 16)}…`)
      } catch (err) {
        log.write(err)
      }
    }

    const caps = h('p', { class: 'muted' })
    void PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then((ok) => {
      caps.textContent = `端末の生体認証（プラットフォーム認証器）: ${ok ? '利用可能' : '利用不可'}`
    })

    root.append(
      notice('デモ用のため、登録したパスキーはサーバーに保存されません。不要になったら端末のパスワード設定から削除してください。'),
      h(
        'div',
        { class: 'panel' },
        caps,
        ids,
        h(
          'div',
          { class: 'row' },
          button('パスキーを登録', register),
          button('パスキーで認証', authenticate, 'secondary'),
          button('登録記録を消去', () => {
            localStorage.removeItem(STORAGE_KEY)
            refreshIds()
            log.write('この端末の登録記録を消去しました（パスキー自体は OS 側に残ります）')
          }, 'secondary'),
        ),
      ),
      log.el,
    )
    refreshIds()
  },
}

type Child = Node | string | null | undefined | false
type Attrs = Record<string, string | boolean | EventListener | undefined>

/** 小さな DOM 生成ヘルパ。`on*` 属性はイベントリスナとして登録する */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue
    if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2), value)
    } else if (value === true) {
      el.setAttribute(key, '')
    } else {
      el.setAttribute(key, String(value))
    }
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue
    el.append(child)
  }
  return el
}

export function button(label: string, onClick: () => unknown, className?: string): HTMLButtonElement {
  return h('button', { type: 'button', class: className, onclick: () => void onClick() }, label)
}

export function notice(text: string, kind: 'warn' | 'error' = 'warn'): HTMLElement {
  return h('div', { class: kind === 'error' ? 'notice error' : 'notice' }, text)
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`
  return String(err)
}

/** ログパネル。各デモの実行結果を時刻付きで新しい順に表示する */
export function createLog(): { el: HTMLElement; write(msg: unknown): void } {
  const el = h('div', { class: 'log', role: 'log', 'aria-live': 'polite' })
  return {
    el,
    write(msg) {
      const time = new Date().toLocaleTimeString('ja-JP')
      const text =
        msg instanceof Error ? errorMessage(msg) : typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2)
      el.textContent = `[${time}] ${text}\n` + (el.textContent ?? '')
    },
  }
}

/** キーと値の一覧（dl）。update で値を差し替える */
export function createKv(keys: string[]): { el: HTMLElement; update(values: Record<string, unknown>): void } {
  const dds = new Map<string, HTMLElement>()
  const el = h('dl', { class: 'kv' })
  for (const key of keys) {
    const dd = h('dd', {}, '—')
    dds.set(key, dd)
    el.append(h('dt', {}, key), dd)
  }
  return {
    el,
    update(values) {
      for (const [key, value] of Object.entries(values)) {
        const dd = dds.get(key)
        if (dd) dd.textContent = value === null || value === undefined ? '—' : String(value)
      }
    },
  }
}

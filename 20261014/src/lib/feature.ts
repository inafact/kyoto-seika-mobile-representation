/** 調査表（mobile-web-device-capabilities-2026.md）の凡例に対応 */
export type Support = 'yes' | 'partial' | 'no'

export interface Feature {
  id: string
  title: string
  api: string
  support: { ios: Support; android: Support }
  /** 調査表の備考 */
  note: string
  /** 画面を描画する。返り値の関数はページ離脱時のクリーンアップ */
  render(root: HTMLElement): void | (() => void)
}

export const supportLabel: Record<Support, string> = {
  yes: '◎',
  partial: '△',
  no: '×',
}

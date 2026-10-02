import type { CategoryColor } from '@shared/contract'

/** Muted category colors that read on both light and dark surfaces. */
export const CATEGORY_HEX: Record<CategoryColor, string> = {
  blue: '#3B6FE0',
  teal: '#1F9E94',
  green: '#3E9E57',
  lime: '#86A82F',
  amber: '#D29A1C',
  orange: '#DB7A2B',
  rose: '#D95468',
  pink: '#C85AA6',
  violet: '#8B62D6',
  indigo: '#5A63D8',
  cyan: '#2A9CC4',
  slate: '#6B7A90',
}

export function categoryHex(color: CategoryColor | undefined): string {
  return CATEGORY_HEX[color ?? 'slate']
}

/** Reads a design token as a CSS color, for canvas charts that cannot use classes. */
export function tokenColor(name: string, alpha = 1): string {
  const rgb = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim()
  return `rgb(${rgb} / ${alpha})`
}

/// <reference types="node" />
import { readFileSync } from 'node:fs'

// Read from disk: Vitest blanks out CSS imports, even with ?raw.
const css = readFileSync('src/style.css', 'utf8')

type Rgb = [number, number, number]

/** The `--token: r g b;` lines of one rule of style.css. */
function tokens(selector: string): Record<string, Rgb> {
  const start = css.indexOf(`${selector} {`)
  expect(start, `style.css has no "${selector}" rule`).toBeGreaterThanOrEqual(0)
  const block = css.slice(start, css.indexOf('}', start))
  const found: Record<string, Rgb> = {}
  for (const [, name, r, g, b] of block.matchAll(/--([a-z-]+):\s*(\d+) (\d+) (\d+);/g)) found[name!] = [Number(r), Number(g), Number(b)]
  return found
}

/** WCAG 2.1 relative luminance and contrast ratio. */
function luminance([r, g, b]: Rgb): number {
  const linear = (channel: number) => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}
function contrast(a: Rgb, b: Rgb): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (light! + 0.05) / (dark! + 0.05)
}

const MIN_TEXT_CONTRAST = 4.5
const TEXT = ['ink', 'muted', 'primary', 'success', 'warning', 'danger']
const BACKGROUNDS = ['bg', 'surface', 'fill']
/** UiBadge and the soft StatCard: a tone as text on its own soft background. */
const SOFT_PAIRS = ['primary', 'success', 'warning', 'danger']

describe.each([
  ['light', ':root'],
  ['dark', '.dark'],
])('text contrast of the %s theme', (_theme, selector) => {
  const theme = tokens(selector)

  it('the formula matches the WCAG reference values', () => {
    expect(contrast([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5)
    expect(contrast([119, 119, 119], [255, 255, 255])).toBeCloseTo(4.48, 2)
  })

  it.each(TEXT.flatMap((text) => BACKGROUNDS.map((background) => [text, background])))('%s on %s reaches 4.5:1', (text, background) => {
    expect(contrast(theme[text!]!, theme[background!]!)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
  })

  it.each(SOFT_PAIRS)('%s on its own soft background reaches 4.5:1', (tone) => {
    expect(contrast(theme[tone]!, theme[`${tone}-soft`]!)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
  })

  it('primary-ink on primary (the main button) reaches 4.5:1', () => {
    expect(contrast(theme['primary-ink']!, theme.primary!)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
  })
})

import type { IsoDate, Month } from '@shared/contract'

const NBSP = /[  ]/g

const copFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const numberFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })

/** 1250000 -> "$ 1.250.000". Negative -> "-$ 1.250.000". */
export function formatMoney(value: number): string {
  // `|| 0` turns -0 into 0: "-$ 0" is not a figure.
  return copFormatter.format(value || 0).replace(NBSP, ' ')
}

/** 1250000 -> "1.250.000" (no symbol, for inputs). */
export function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

/** Short figure for chart axes: 1250000 -> "$ 1,3 M", 78000 -> "$ 78 k". */
export function formatMoneyCompact(value: number): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  const oneDecimal = (n: number) => n.toLocaleString('es-CO', { maximumFractionDigits: 1 })
  // 999.950 already rounds to "1.000 k": show it as "1 M".
  if (abs >= 999_950) return `${sign}$ ${oneDecimal(abs / 1_000_000)} M`
  if (abs >= 1_000) return `${sign}$ ${oneDecimal(abs / 1_000)} k`
  return `${sign}$ ${abs}`
}

/** Takes a FRACTION: 0.2595 -> "26 %", with decimals=1 -> "26,0 %". Null -> "—". */
export function formatPercent(fraction: number | null, decimals = 0): string {
  if (fraction == null || !Number.isFinite(fraction)) return '—'
  const pct = (fraction * 100).toLocaleString('es-CO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  return `${pct} %`
}

/** Signed change for "vs last month": 0.1 -> "+10 %". A change that rounds to zero carries no sign. */
export function formatChange(fraction: number | null): string {
  if (fraction == null || !Number.isFinite(fraction)) return '—'
  const text = formatPercent(Math.abs(fraction))
  if (text === formatPercent(0)) return text
  return fraction > 0 ? `+${text}` : `-${text}`
}

/** "1.250.000" or "1,250,000": groups of three after a 1-3 digit head that does not start with 0. */
const grouped = (text: string, separator: string): boolean => {
  const [head, ...groups] = text.split(separator)
  return groups.length > 0 && /^[1-9]\d{0,2}$/.test(head!) && groups.every((g) => /^\d{3}$/.test(g))
}

/**
 * Reads the digits part. A separator only counts as thousands when it really
 * groups by three ("1.250.000", "1,500"); otherwise it is the decimal mark
 * ("1.5", "1500.50", "1,5"). Anything ambiguous or malformed ("1.5.3") is NaN.
 */
function parsePlainNumber(digits: string): number {
  const text = digits.replace(/[.,]$/, '')
  const lastDot = text.lastIndexOf('.')
  const lastComma = text.lastIndexOf(',')
  if (lastDot === -1 && lastComma === -1) return Number(text)
  if (lastDot !== -1 && lastComma !== -1) {
    // Both: the last one is the decimal mark, the other one groups thousands.
    const decimalAt = Math.max(lastDot, lastComma)
    const thousands = lastDot > lastComma ? ',' : '.'
    const whole = text.slice(0, decimalAt)
    const decimals = text.slice(decimalAt + 1)
    if (!grouped(whole, thousands) || !/^\d+$/.test(decimals)) return NaN
    return Number(`${whole.split(thousands).join('')}.${decimals}`)
  }
  const separator = lastDot !== -1 ? '.' : ','
  if (grouped(text, separator)) return Number(text.split(separator).join(''))
  const parts = text.split(separator)
  return parts.length === 2 ? Number(`${parts[0]}.${parts[1]}`) : NaN
}

/**
 * Parses what a person types into pesos. Accepts "200k", "1,5m", "1.143.415,93",
 * "$ 78.000", "500". Returns null when it is not a number.
 * With a k/m suffix a lone "." or "," is always the decimal mark ("1.500k" is 1.500).
 */
export function parseMoney(text: string): number | null {
  const clean = text.toLowerCase().replace(NBSP, '').replace(/[\s$]/g, '')
  if (!clean) return null
  const match = /^(\d[\d.,]*)(k|m|mil|millones|mill[oó]n)?$/.exec(clean)
  if (!match) return null
  const digits = match[1]!
  const suffix = match[2]
  let value: number
  if (suffix) {
    value = /^\d+[.,]\d+$/.test(digits) ? Number(digits.replace(',', '.')) : parsePlainNumber(digits)
    value *= suffix === 'k' || suffix === 'mil' ? 1_000 : 1_000_000
  } else {
    value = parsePlainNumber(digits)
  }
  if (!Number.isFinite(value)) return null
  return Math.round(value)
}

// ---------- dates (always LOCAL time: toISOString() is UTC and gives tomorrow at night in Colombia) ----------
const pad = (n: number) => String(n).padStart(2, '0')

export function todayIso(now = new Date()): IsoDate {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function currentMonth(now = new Date()): Month {
  return todayIso(now).slice(0, 7)
}

export function addMonths(month: Month, delta: number): Month {
  const [y, m] = month.split('-').map(Number) as [number, number]
  const index = y * 12 + (m - 1) + delta
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`
}

export function monthOf(date: IsoDate): Month {
  return date.slice(0, 7)
}

export function daysInMonth(month: Month): number {
  const [y, m] = month.split('-').map(Number) as [number, number]
  return new Date(y, m, 0).getDate()
}

const MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** "2026-10" -> "Octubre 2026" */
export function monthLabel(month: Month): string {
  const [y, m] = month.split('-').map(Number) as [number, number]
  return `${capitalize(MONTH_NAMES[m - 1]!)} ${y}`
}

/** "2026-10" -> "oct 26" (chart axes, table headers) */
export function monthShort(month: Month): string {
  const [y, m] = month.split('-').map(Number) as [number, number]
  return `${MONTH_NAMES[m - 1]!.slice(0, 3)} ${String(y).slice(2)}`
}

function toLocalDate(date: IsoDate): Date {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  return new Date(y, m - 1, d)
}

/** "2026-10-02" -> "vie 2 oct" */
export function dateShort(date: IsoDate): string {
  const d = toLocalDate(date)
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]!.slice(0, 3)}`
}

/** "2026-10-02" -> "2 de octubre de 2026" */
export function dateLong(date: IsoDate): string {
  const d = toLocalDate(date)
  return `${d.getDate()} de ${MONTH_NAMES[d.getMonth()]} de ${d.getFullYear()}`
}

/** Whole days from today to the date: negative = already past. */
export function daysUntil(date: IsoDate, today = todayIso()): number {
  return Math.round((toLocalDate(date).getTime() - toLocalDate(today).getTime()) / 86_400_000)
}

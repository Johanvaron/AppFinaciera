/** Date helpers. Dates are 'YYYY-MM-DD' and months 'YYYY-MM' strings, compared lexicographically. */
import type { IsoDate, Month } from '../../shared/contract.ts'

/** Returns today's date. Injectable so tests can pin "today". */
export type Clock = () => IsoDate

const pad = (n: number): string => String(n).padStart(2, '0')

/** Local system date. Never use toISOString(): it is UTC and gives tomorrow at night in Colombia. */
export const systemClock: Clock = () => {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export const monthOf = (date: IsoDate): Month => date.slice(0, 7)

const monthIndex = (month: Month): number => Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1

const monthFromIndex = (index: number): Month =>
  `${String(Math.floor(index / 12)).padStart(4, '0')}-${pad((index % 12) + 1)}`

export const addMonths = (month: Month, delta: number): Month => monthFromIndex(monthIndex(month) + delta)

export function daysInMonth(month: Month): number {
  const year = Number(month.slice(0, 4))
  const monthNumber = Number(month.slice(5, 7))
  return new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
}

/** False for well-formed but impossible dates such as 2026-02-31, which would fall outside every month range. */
export const isRealDate = (date: IsoDate): boolean => Number(date.slice(8, 10)) <= daysInMonth(monthOf(date))

export const dayOfMonth = (month: Month, day: number): IsoDate => `${month}-${pad(day)}`

/** First and last day of a month. */
export function monthBounds(month: Month): { from: IsoDate; to: IsoDate } {
  return { from: dayOfMonth(month, 1), to: dayOfMonth(month, daysInMonth(month)) }
}

/** Every day of the month, in order. */
export function monthDays(month: Month): IsoDate[] {
  return Array.from({ length: daysInMonth(month) }, (_, i) => dayOfMonth(month, i + 1))
}

/** Inclusive list of months, oldest first. Empty when from > to. */
export function monthRange(from: Month, to: Month): Month[] {
  const months: Month[] = []
  for (let i = monthIndex(from); i <= monthIndex(to); i++) months.push(monthFromIndex(i))
  return months
}

/** Day `dueDay` of the month, clamped to the month's last day (31 -> 30/28). */
export function dueDateFor(month: Month, dueDay: number | null): IsoDate | null {
  if (dueDay == null) return null
  return dayOfMonth(month, Math.min(dueDay, daysInMonth(month)))
}

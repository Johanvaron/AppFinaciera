/**
 * Pure logic of the Reports screen: range derivation, range figures and the
 * category x month matrix. No Vue, no API: everything here is unit tested.
 */
import type { CategoryReport, Month, MonthlyReportRow } from '@shared/contract'
import { addMonths, formatMoney, monthLabel } from '@/lib/format'

export type RangeKey = '3' | '6' | '12' | 'year'

export const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: '3', label: '3 meses' },
  { value: '6', label: '6 meses' },
  { value: '12', label: '12 meses' },
  { value: 'year', label: 'Este año' },
]

export interface ReportRange {
  from: Month
  to: Month
  /** How many months the range covers, both ends included. */
  months: number
}

/** The range always ends in `current`. "year" goes from January to `current`. */
export function deriveRange(key: RangeKey, current: Month): ReportRange {
  const months = key === 'year' ? Number(current.slice(5, 7)) : Number(key)
  return { from: addMonths(current, -(months - 1)), to: current, months }
}

export interface RangeTotals {
  income: number
  expenses: number
  net: number
  /** Monthly average over every month of the range, the same denominator as the matrix and the server. */
  averageExpense: number
  /** Month with the highest expense; null when nothing was spent. */
  peak: MonthlyReportRow | null
}

const hasMovement = (row: MonthlyReportRow) => row.income !== 0 || row.expenses !== 0

export function rangeTotals(rows: MonthlyReportRow[]): RangeTotals {
  const income = rows.reduce((sum, row) => sum + row.income, 0)
  const expenses = rows.reduce((sum, row) => sum + row.expenses, 0)
  let peak: MonthlyReportRow | null = null
  for (const row of rows) {
    if (row.expenses > 0 && (!peak || row.expenses > peak.expenses)) peak = row
  }
  return {
    income,
    expenses,
    net: income - expenses,
    averageExpense: rows.length ? Math.round(expenses / rows.length) : 0,
    peak,
  }
}

/** True when no month of the range has a single movement. */
export function isEmptyRange(rows: MonthlyReportRow[]): boolean {
  return !rows.some(hasMovement)
}

/** Detail of the average card: says how many months the average is divided by. */
export function averageDetailText(months: number): string {
  return months === 1 ? 'Promedio del rango: 1 mes' : `Promedio del rango: ${months} meses`
}

/** "Octubre 2026 · $ 1.250.000", or "—" when nothing was spent. */
export function peakMonthText(totals: RangeTotals): string {
  return totals.peak ? `${monthLabel(totals.peak.month)} · ${formatMoney(totals.peak.expenses)}` : '—'
}

/** Text of a matrix cell: zero reads as a dash, not as "$ 0". */
export function cellText(value: number): string {
  return value === 0 ? '—' : formatMoney(value)
}

/** Index of the peak month of a row; -1 when the whole row is zero. Ties keep the earliest. */
export function maxCellIndex(totals: number[]): number {
  let best = -1
  totals.forEach((value, index) => {
    if (value > 0 && (best === -1 || value > totals[best]!)) best = index
  })
  return best
}

export interface MatrixFooter {
  /** Sum of every category, one per month. */
  totals: number[]
  total: number
  /** Monthly average over the whole range. */
  average: number
}

export function matrixFooter(report: CategoryReport): MatrixFooter {
  const totals = report.months.map((_, index) => report.rows.reduce((sum, row) => sum + (row.totals[index] ?? 0), 0))
  const total = totals.reduce((sum, value) => sum + value, 0)
  return { totals, total, average: totals.length ? Math.round(total / totals.length) : 0 }
}

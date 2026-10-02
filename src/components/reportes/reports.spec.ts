import type { Category, CategoryReport, MonthlyReportRow } from '@shared/contract'
import {
  averageExpenseText,
  cellText,
  deriveRange,
  isEmptyRange,
  matrixFooter,
  maxCellIndex,
  peakMonthText,
  rangeTotals,
} from './reports'

const row = (month: string, income: number, expenses: number): MonthlyReportRow => ({ month, income, expenses, net: income - expenses })

const category = (id: number, name: string): Category => ({ id, name, kind: 'expense', group: 'variables', color: 'blue', archived: false })

describe('deriveRange', () => {
  it('covers the last N months ending in the current one', () => {
    expect(deriveRange('3', '2026-10')).toEqual({ from: '2026-08', to: '2026-10', months: 3 })
    expect(deriveRange('6', '2026-10')).toEqual({ from: '2026-05', to: '2026-10', months: 6 })
  })

  it('crosses into the previous year', () => {
    expect(deriveRange('12', '2026-10')).toEqual({ from: '2025-11', to: '2026-10', months: 12 })
    expect(deriveRange('3', '2026-01')).toEqual({ from: '2025-11', to: '2026-01', months: 3 })
    expect(deriveRange('6', '2026-02')).toEqual({ from: '2025-09', to: '2026-02', months: 6 })
  })

  it('"this year" goes from January to the current month', () => {
    expect(deriveRange('year', '2026-10')).toEqual({ from: '2026-01', to: '2026-10', months: 10 })
    expect(deriveRange('year', '2026-01')).toEqual({ from: '2026-01', to: '2026-01', months: 1 })
    expect(deriveRange('year', '2026-12')).toEqual({ from: '2026-01', to: '2026-12', months: 12 })
  })
})

describe('rangeTotals', () => {
  const rows = [row('2026-07', 0, 0), row('2026-08', 4_000_000, 1_500_000), row('2026-09', 0, 2_750_000), row('2026-10', 4_200_000, 900_000)]

  it('adds income, expenses and net over the range', () => {
    const totals = rangeTotals(rows)
    expect(totals.income).toBe(8_200_000)
    expect(totals.expenses).toBe(5_150_000)
    expect(totals.net).toBe(3_050_000)
  })

  it('averages the expense only over months with movements', () => {
    // 5.150.000 / 3 active months (July is empty), not / 4.
    expect(averageExpenseText(rangeTotals(rows))).toBe('$ 1.716.667')
  })

  it('counts a month with only income as active', () => {
    expect(averageExpenseText(rangeTotals([row('2026-09', 1_000_000, 0), row('2026-10', 0, 300_000)]))).toBe('$ 150.000')
  })

  it('finds the month with the highest expense', () => {
    expect(peakMonthText(rangeTotals(rows))).toBe('Septiembre 2026 · $ 2.750.000')
  })

  it('goes negative when more was spent than earned', () => {
    expect(rangeTotals([row('2026-10', 500_000, 780_000)]).net).toBe(-280_000)
  })

  it('shows dashes when the range has no movements', () => {
    const empty = rangeTotals([row('2026-09', 0, 0), row('2026-10', 0, 0)])
    expect(averageExpenseText(empty)).toBe('—')
    expect(peakMonthText(empty)).toBe('—')
    expect(empty.net).toBe(0)
  })

  it('has no peak month when there was only income', () => {
    expect(peakMonthText(rangeTotals([row('2026-10', 900_000, 0)]))).toBe('—')
  })
})

describe('isEmptyRange', () => {
  it('is empty only when every month is zero', () => {
    expect(isEmptyRange([])).toBe(true)
    expect(isEmptyRange([row('2026-09', 0, 0), row('2026-10', 0, 0)])).toBe(true)
    expect(isEmptyRange([row('2026-09', 0, 0), row('2026-10', 0, 1)])).toBe(false)
    expect(isEmptyRange([row('2026-10', 1, 0)])).toBe(false)
  })
})

describe('matrix', () => {
  const report: CategoryReport = {
    months: ['2026-08', '2026-09', '2026-10'],
    rows: [
      { category: category(1, 'Mercado'), totals: [600_000, 0, 750_000], total: 1_350_000, average: 450_000 },
      { category: category(2, 'Transporte'), totals: [120_000, 95_000, 0], total: 215_000, average: 71_667 },
    ],
  }

  it('sums every category per month, plus total and average', () => {
    const footer = matrixFooter(report)
    expect(footer.totals.map(cellText)).toEqual(['$ 720.000', '$ 95.000', '$ 750.000'])
    expect(cellText(footer.total)).toBe('$ 1.565.000')
    expect(cellText(footer.average)).toBe('$ 521.667')
  })

  it('handles a report without rows or months', () => {
    expect(matrixFooter({ months: ['2026-10'], rows: [] })).toEqual({ totals: [0], total: 0, average: 0 })
    expect(matrixFooter({ months: [], rows: [] })).toEqual({ totals: [], total: 0, average: 0 })
  })

  it('marks the peak month of each row', () => {
    expect(maxCellIndex([600_000, 0, 750_000])).toBe(2)
    expect(maxCellIndex([120_000, 95_000, 0])).toBe(0)
    expect(maxCellIndex([0, 80_000, 80_000])).toBe(1)
    expect(maxCellIndex([0, 0, 0])).toBe(-1)
    expect(maxCellIndex([])).toBe(-1)
  })

  it('writes zero cells as a dash', () => {
    expect(cellText(0)).toBe('—')
    expect(cellText(95_000)).toBe('$ 95.000')
    expect(cellText(1_350_000)).toBe('$ 1.350.000')
  })
})

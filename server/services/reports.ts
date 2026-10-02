import type { CategoryKind, CategoryReport, CategoryReportRow, Month, MonthlyReportRow } from '../../shared/contract.ts'
import { addMonths, monthBounds, monthOf, monthRange, type Clock } from '../lib/dates.ts'
import { invalid } from '../lib/errors.ts'
import type { CategoryRepository } from '../repositories/categories.ts'
import type { TransactionRepository } from '../repositories/transactions.ts'

const DEFAULT_MONTHS = 12
/** Upper bound of the category matrix, so a typo in the year cannot ask for centuries. */
const MAX_CATEGORY_MONTHS = 120

export interface CategoryReportQuery {
  from?: Month | undefined
  to?: Month | undefined
  kind: CategoryKind
}

export class ReportService {
  private readonly transactions: TransactionRepository
  private readonly categories: CategoryRepository
  private readonly clock: Clock

  constructor(transactions: TransactionRepository, categories: CategoryRepository, clock: Clock) {
    this.transactions = transactions
    this.categories = categories
    this.clock = clock
  }

  /** Income / expenses / net of the last `months` months up to `until`, oldest first, empty months included. */
  monthly(months = DEFAULT_MONTHS, until: Month = monthOf(this.clock())): MonthlyReportRow[] {
    const range = monthRange(addMonths(until, -(months - 1)), until)
    const rows = new Map<Month, MonthlyReportRow>(
      range.map((month) => [month, { month, income: 0, expenses: 0, net: 0 }]),
    )
    const { from, to } = this.bounds(range)
    for (const total of this.transactions.monthlyTotals(from, to)) {
      const row = rows.get(total.month)
      if (!row) continue
      if (total.type === 'income') row.income = total.total
      else row.expenses = total.total
      row.net = row.income - row.expenses
    }
    return [...rows.values()]
  }

  /** Category x month matrix. Defaults to the last 12 months up to the current one. */
  categoryMatrix(query: CategoryReportQuery): CategoryReport {
    const until = query.to ?? monthOf(this.clock())
    const since = query.from ?? addMonths(until, -(DEFAULT_MONTHS - 1))
    if (since > until) throw invalid({ from: 'El mes inicial no puede ser posterior al final' })
    const months = monthRange(since, until)
    if (months.length > MAX_CATEGORY_MONTHS) throw invalid({ from: `El rango máximo es de ${MAX_CATEGORY_MONTHS} meses` })

    const index = new Map(months.map((month, position) => [month, position]))
    const categories = new Map(this.categories.list().map((category) => [category.id, category]))
    const rows = new Map<number, CategoryReportRow>()
    const { from, to } = this.bounds(months)
    for (const cell of this.transactions.categoryMonthTotals(from, to, query.kind)) {
      const category = categories.get(cell.categoryId)
      const position = index.get(cell.month)
      if (!category || position === undefined) continue
      let row = rows.get(category.id)
      if (!row) {
        row = { category, totals: months.map(() => 0), total: 0, average: 0 }
        rows.set(category.id, row)
      }
      row.totals[position] = cell.total
      row.total += cell.total
    }
    for (const row of rows.values()) row.average = Math.round(row.total / months.length)
    return {
      months,
      rows: [...rows.values()].sort((a, b) => b.total - a.total || a.category.id - b.category.id),
    }
  }

  private bounds(months: Month[]): { from: string; to: string } {
    const first = months[0] as Month
    const last = months[months.length - 1] as Month
    return { from: monthBounds(first).from, to: monthBounds(last).to }
  }
}

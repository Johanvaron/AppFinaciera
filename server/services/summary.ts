/** The dashboard: everything about one month in a single response. */
import type {
  Category,
  CategoryKind,
  CategoryTotal,
  DailyPoint,
  FixedMonthItem,
  Month,
  MonthSummary,
} from '../../shared/contract.ts'
import { addMonths, monthBounds, monthDays, monthOf, type Clock } from '../lib/dates.ts'
import type { CategoryRepository } from '../repositories/categories.ts'
import type { TransactionRepository } from '../repositories/transactions.ts'
import type { AccountService } from './accounts.ts'
import type { FixedService } from './fixed.ts'

const RECENT_LIMIT = 8

/** (current - previous) / previous; null when there is nothing to compare against. */
const change = (current: number, previous: number): number | null =>
  previous === 0 ? null : (current - previous) / previous

/** Unpaid items, soonest due date first; the ones without due date go last. */
function upcoming(items: FixedMonthItem[]): FixedMonthItem[] {
  return items
    .filter((item) => item.status === 'pending' || item.status === 'overdue')
    .sort((a, b) => {
      if (a.dueDate === b.dueDate) return 0
      if (a.dueDate == null) return 1
      if (b.dueDate == null) return -1
      return a.dueDate < b.dueDate ? -1 : 1
    })
}

export class SummaryService {
  private readonly transactions: TransactionRepository
  private readonly categories: CategoryRepository
  private readonly accounts: AccountService
  private readonly fixed: FixedService
  private readonly clock: Clock

  constructor(
    transactions: TransactionRepository,
    categories: CategoryRepository,
    accounts: AccountService,
    fixed: FixedService,
    clock: Clock,
  ) {
    this.transactions = transactions
    this.categories = categories
    this.accounts = accounts
    this.fixed = fixed
    this.clock = clock
  }

  month(month: Month = monthOf(this.clock())): MonthSummary {
    const { from, to } = monthBounds(month)
    const previousMonth = addMonths(month, -1)
    const previousBounds = monthBounds(previousMonth)
    const current = this.transactions.totalsByType(from, to)
    const previous = this.transactions.totalsByType(previousBounds.from, previousBounds.to)
    const checklist = this.fixed.month(month)
    const net = current.income - current.expenses
    const accounts = this.accounts.list().filter((account) => !account.archived)
    const categories = new Map(this.categories.list().map((category) => [category.id, category]))

    return {
      month,
      income: current.income,
      expenses: current.expenses,
      net,
      savingsRate: current.income === 0 ? null : net / current.income,
      pendingFixed: checklist.totals.pending,
      availableToSpend: net - checklist.totals.pending,
      previous: { month: previousMonth, ...previous, net: previous.income - previous.expenses },
      change: {
        income: change(current.income, previous.income),
        expenses: change(current.expenses, previous.expenses),
      },
      expensesByCategory: this.byCategory(month, 'expense', current.expenses, categories),
      incomeByCategory: this.byCategory(month, 'income', current.income, categories),
      daily: this.daily(month),
      previousDailyCumulative: this.daily(previousMonth, false).map((point) => point.cumulative ?? 0),
      upcomingFixed: upcoming(checklist.items),
      recent: this.transactions.search({ from, to }).slice(0, RECENT_LIMIT),
      accounts,
      totalBalance: accounts.reduce((total, account) => total + account.balance, 0),
    }
  }

  private byCategory(
    month: Month,
    kind: CategoryKind,
    kindTotal: number,
    categories: Map<number, Category>,
  ): CategoryTotal[] {
    const { from, to } = monthBounds(month)
    const totals: CategoryTotal[] = []
    for (const row of this.transactions.totalsByCategory(from, to, kind)) {
      const category = categories.get(row.categoryId)
      if (!category) continue
      totals.push({ category, total: row.total, count: row.count, share: kindTotal === 0 ? 0 : row.total / kindTotal })
    }
    return totals
  }

  /** One point per day. With `hideFuture`, days after today have a null cumulative. */
  private daily(month: Month, hideFuture = true): DailyPoint[] {
    const { from, to } = monthBounds(month)
    const byDay = this.transactions.expensesByDay(from, to)
    const today = this.clock()
    let running = 0
    return monthDays(month).map((date) => {
      const spent = byDay.get(date) ?? 0
      running += spent
      return { date, spent, cumulative: hideFuture && date > today ? null : running }
    })
  }
}

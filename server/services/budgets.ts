import type { z } from 'zod'
import type {
  BudgetMonthResponse,
  BudgetRow,
  BudgetState,
  Category,
  Month,
  budgetInputSchema,
} from '../../shared/contract.ts'
import { monthBounds, monthOf, type Clock } from '../lib/dates.ts'
import { invalid } from '../lib/errors.ts'
import type { BudgetRepository } from '../repositories/budgets.ts'
import type { CategoryRepository } from '../repositories/categories.ts'
import type { TransactionRepository } from '../repositories/transactions.ts'

type BudgetData = z.output<typeof budgetInputSchema>

/** ok < 80 %, warning 80-100 %, over > 100 %. Integer math: no float thresholds. */
function stateOf(budget: number | null, spent: number): BudgetState {
  if (budget == null) return 'none'
  if (spent > budget) return 'over'
  if (budget === 0) return 'ok'
  return spent * 10 < budget * 8 ? 'ok' : 'warning'
}

function buildRow(category: Category, budget: number | null, spent: number): BudgetRow {
  return {
    category,
    budget,
    spent,
    remaining: budget == null ? null : budget - spent,
    ratio: budget == null || budget === 0 ? null : spent / budget,
    state: stateOf(budget, spent),
  }
}

export class BudgetService {
  private readonly budgets: BudgetRepository
  private readonly categories: CategoryRepository
  private readonly transactions: TransactionRepository
  private readonly clock: Clock

  constructor(budgets: BudgetRepository, categories: CategoryRepository, transactions: TransactionRepository, clock: Clock) {
    this.budgets = budgets
    this.categories = categories
    this.transactions = transactions
    this.clock = clock
  }

  /** One row per active expense category, plus archived ones that had spending that month. */
  month(month: Month = monthOf(this.clock())): BudgetMonthResponse {
    const { from, to } = monthBounds(month)
    const inForce = new Map(this.budgets.inForce(month).map((record) => [record.categoryId, record.amount]))
    const spentBy = new Map(
      this.transactions.totalsByCategory(from, to, 'expense').map((row) => [row.categoryId, row.total]),
    )
    const rows = this.categories
      .list()
      .filter((category) => category.kind === 'expense' && (!category.archived || (spentBy.get(category.id) ?? 0) > 0))
      .map((category) => buildRow(category, inForce.get(category.id) ?? null, spentBy.get(category.id) ?? 0))

    const budgeted = rows.filter((row) => row.budget != null)
    const budget = budgeted.reduce((total, row) => total + (row.budget ?? 0), 0)
    const budgetedSpent = budgeted.reduce((total, row) => total + row.spent, 0)
    return {
      month,
      rows,
      totals: {
        budget,
        spent: this.transactions.totalsByType(from, to).expenses,
        remaining: budget - budgetedSpent,
      },
    }
  }

  /** Sets (or with a null amount, removes) the budget of a category from `month` onward. */
  set(data: BudgetData): BudgetMonthResponse {
    const category = this.categories.get(data.categoryId)
    if (!category) throw invalid({ categoryId: 'La categoría no existe' })
    if (category.kind !== 'expense') throw invalid({ categoryId: 'Solo las categorías de gastos llevan presupuesto' })
    const current = this.budgets.find(data.categoryId, data.month)
    if (current) this.budgets.update(current.id, { amount: data.amount })
    else this.budgets.insert(data)
    return this.month(data.month)
  }
}

import type { z } from 'zod'
import type { Category, categoryInputSchema } from '../../shared/contract.ts'
import { conflict, notFound } from '../lib/errors.ts'
import type { BudgetRepository } from '../repositories/budgets.ts'
import type { CategoryRepository } from '../repositories/categories.ts'
import type { FixedExpenseRepository } from '../repositories/fixed-expenses.ts'
import type { TransactionRepository } from '../repositories/transactions.ts'

type CategoryData = z.output<typeof categoryInputSchema>

export class CategoryService {
  private readonly categories: CategoryRepository
  private readonly transactions: TransactionRepository
  private readonly fixed: FixedExpenseRepository
  private readonly budgets: BudgetRepository

  constructor(
    categories: CategoryRepository,
    transactions: TransactionRepository,
    fixed: FixedExpenseRepository,
    budgets: BudgetRepository,
  ) {
    this.categories = categories
    this.transactions = transactions
    this.fixed = fixed
    this.budgets = budgets
  }

  list(): Category[] {
    return this.categories.list()
  }

  create(data: CategoryData): Category {
    return this.categories.insert(data)
  }

  update(id: number, patch: Partial<CategoryData>): Category {
    const current = this.categories.get(id)
    if (!current) throw notFound('La categoría no existe')
    // Flipping income <-> expense would leave its movements with the wrong kind.
    if (patch.kind !== undefined && patch.kind !== current.kind && this.inUse(id)) {
      throw conflict('Esta categoría ya tiene movimientos, gastos fijos o presupuestos; no se le puede cambiar el tipo.')
    }
    return this.categories.update(id, patch) as Category
  }

  remove(id: number): void {
    if (!this.categories.exists(id)) throw notFound('La categoría no existe')
    if (this.inUse(id)) {
      throw conflict('Esta categoría tiene movimientos, gastos fijos o presupuestos asociados; archívala en su lugar.')
    }
    this.categories.delete(id)
  }

  private inUse(id: number): boolean {
    return (
      this.transactions.countByCategory(id) > 0 ||
      this.fixed.countByCategory(id) > 0 ||
      this.budgets.countByCategory(id) > 0
    )
  }
}

import type { DatabaseSync } from 'node:sqlite'
import type { Month } from '../../shared/contract.ts'
import { BaseRepository } from './base.ts'

export interface BudgetRecord {
  id: number
  categoryId: number
  month: Month
  /** Null = "no budget from this month onward". */
  amount: number | null
}

export class BudgetRepository extends BaseRepository<BudgetRecord> {
  constructor(db: DatabaseSync) {
    super(db, 'budgets')
  }

  find(categoryId: number, month: Month): BudgetRecord | undefined {
    return this.select('WHERE category_id = ? AND month = ?', categoryId, month)[0]
  }

  /** The row in force for each category in `month`: the one with the greatest month <= `month`. */
  inForce(month: Month): BudgetRecord[] {
    return this.select(
      `WHERE month = (SELECT MAX(b.month) FROM budgets b
                       WHERE b.category_id = budgets.category_id AND b.month <= ?)`,
      month,
    )
  }

  countByCategory(categoryId: number): number {
    return this.count('SELECT COUNT(*) FROM budgets WHERE category_id = ?', categoryId)
  }
}

import type { DatabaseSync } from 'node:sqlite'
import type { FixedExpense, Month } from '../../shared/contract.ts'
import { BaseRepository } from './base.ts'

export class FixedExpenseRepository extends BaseRepository<FixedExpense> {
  constructor(db: DatabaseSync) {
    super(db, 'fixed_expenses', { booleans: ['variableAmount'], orderBy: 'position, id' })
  }

  /** Fixed expenses that apply to `month`: startMonth <= month <= endMonth (or no end). */
  activeIn(month: Month): FixedExpense[] {
    return this.select(
      'WHERE start_month <= ? AND (end_month IS NULL OR end_month >= ?) ORDER BY position, id',
      month,
      month,
    )
  }

  maxPosition(): number {
    return this.count('SELECT COALESCE(MAX(position), 0) FROM fixed_expenses')
  }

  countByCategory(categoryId: number): number {
    return this.count('SELECT COUNT(*) FROM fixed_expenses WHERE category_id = ?', categoryId)
  }

  countByAccount(accountId: number): number {
    return this.count('SELECT COUNT(*) FROM fixed_expenses WHERE account_id = ?', accountId)
  }
}

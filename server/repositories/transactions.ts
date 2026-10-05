import type { DatabaseSync } from 'node:sqlite'
import type { CategoryKind, IsoDate, Month, Transaction, TransactionType } from '../../shared/contract.ts'
import { BaseRepository, type Param } from './base.ts'

export type TransactionInsert = Omit<Transaction, 'id' | 'createdAt'>

export interface TransactionFilter {
  from?: IsoDate | undefined
  to?: IsoDate | undefined
  type?: TransactionType | undefined
  categoryId?: number | undefined
  /** Matches the account as origin OR as transfer destination. */
  accountId?: number | undefined
}

export interface CategoryAggregate {
  categoryId: number
  total: number
  count: number
}

const NEWEST_FIRST = 'ORDER BY date DESC, id DESC'

export class TransactionRepository extends BaseRepository<Transaction, TransactionInsert> {
  constructor(db: DatabaseSync) {
    super(db, 'transactions')
  }

  search(filter: TransactionFilter): Transaction[] {
    const where: string[] = []
    const params: Param[] = []
    if (filter.from) (where.push('date >= ?'), params.push(filter.from))
    if (filter.to) (where.push('date <= ?'), params.push(filter.to))
    if (filter.type) (where.push('type = ?'), params.push(filter.type))
    if (filter.categoryId) (where.push('category_id = ?'), params.push(filter.categoryId))
    if (filter.accountId) {
      where.push('(account_id = ? OR to_account_id = ?)')
      params.push(filter.accountId, filter.accountId)
    }
    const clause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''
    return this.select(`${clause} ${NEWEST_FIRST}`, ...params)
  }

  countByAccount(accountId: number): number {
    return this.count('SELECT COUNT(*) FROM transactions WHERE account_id = ? OR to_account_id = ?', accountId, accountId)
  }

  countByCategory(categoryId: number): number {
    return this.count('SELECT COUNT(*) FROM transactions WHERE category_id = ?', categoryId)
  }

  /** Sets the category of the given movements, only those whose type matches `type`. Returns how many changed. */
  setCategory(ids: number[], categoryId: number, type: CategoryKind): number {
    const placeholders = ids.map(() => '?').join(', ')
    return this.run(
      `UPDATE transactions SET category_id = ? WHERE type = ? AND id IN (${placeholders})`,
      categoryId,
      type,
      ...ids,
    )
  }

  // ---------- fixed-expense payments ----------

  /** Every payment that applies to `month` (whatever its date), oldest first. */
  fixedPayments(month: Month, fixedExpenseId?: number): Transaction[] {
    if (fixedExpenseId === undefined) {
      return this.select('WHERE fixed_month = ? AND fixed_expense_id IS NOT NULL ORDER BY date, id', month)
    }
    return this.select('WHERE fixed_month = ? AND fixed_expense_id = ? ORDER BY date, id', month, fixedExpenseId)
  }

  /** Payments of one fixed expense dated on or after `since` (by payment date, not by fixed month), oldest first. */
  fixedPaymentsSince(fixedExpenseId: number, since: IsoDate): Transaction[] {
    return this.select('WHERE fixed_expense_id = ? AND date >= ? ORDER BY date, id', fixedExpenseId, since)
  }

  deleteFixedPayments(fixedExpenseId: number, month: Month): number {
    return this.run('DELETE FROM transactions WHERE fixed_expense_id = ? AND fixed_month = ?', fixedExpenseId, month)
  }

  /** First and last month a fixed expense has payments for; undefined when it has none. */
  fixedPaymentSpan(fixedExpenseId: number): { first: Month; last: Month } | undefined {
    const row = this.one(
      'SELECT MIN(fixed_month) AS first, MAX(fixed_month) AS last FROM transactions WHERE fixed_expense_id = ?',
      fixedExpenseId,
    )
    return row?.first == null ? undefined : { first: String(row.first), last: String(row.last) }
  }

  /** Turns the payments of a fixed expense into plain movements. */
  unlinkFixed(fixedExpenseId: number): number {
    return this.run(
      'UPDATE transactions SET fixed_expense_id = NULL, fixed_month = NULL WHERE fixed_expense_id = ?',
      fixedExpenseId,
    )
  }

  // ---------- aggregates (transfers are never income nor expense) ----------

  totalsByType(from: IsoDate, to: IsoDate): { income: number; expenses: number } {
    const row = this.one(
      `SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0) AS income,
              COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) AS expenses
         FROM transactions WHERE date BETWEEN ? AND ?`,
      from,
      to,
    )
    return { income: Number(row?.income ?? 0), expenses: Number(row?.expenses ?? 0) }
  }

  totalsByCategory(from: IsoDate, to: IsoDate, kind: CategoryKind): CategoryAggregate[] {
    return this.all(
      `SELECT category_id, SUM(amount) AS total, COUNT(*) AS count
         FROM transactions
        WHERE type = ? AND date BETWEEN ? AND ?
        GROUP BY category_id
        ORDER BY total DESC, category_id`,
      kind,
      from,
      to,
    ).map((row) => ({ categoryId: Number(row.category_id), total: Number(row.total), count: Number(row.count) }))
  }

  /** Date -> expenses of that day. */
  expensesByDay(from: IsoDate, to: IsoDate): Map<IsoDate, number> {
    const rows = this.all(
      `SELECT date, SUM(amount) AS total FROM transactions
        WHERE type = 'expense' AND date BETWEEN ? AND ? GROUP BY date`,
      from,
      to,
    )
    return new Map(rows.map((row) => [String(row.date), Number(row.total)]))
  }

  monthlyTotals(from: IsoDate, to: IsoDate): { month: Month; type: CategoryKind; total: number }[] {
    return this.all(
      `SELECT substr(date, 1, 7) AS month, type, SUM(amount) AS total
         FROM transactions
        WHERE type IN ('income', 'expense') AND date BETWEEN ? AND ?
        GROUP BY month, type`,
      from,
      to,
    ).map((row) => ({ month: String(row.month), type: row.type as CategoryKind, total: Number(row.total) }))
  }

  categoryMonthTotals(from: IsoDate, to: IsoDate, kind: CategoryKind): { categoryId: number; month: Month; total: number }[] {
    return this.all(
      `SELECT category_id, substr(date, 1, 7) AS month, SUM(amount) AS total
         FROM transactions
        WHERE type = ? AND date BETWEEN ? AND ?
        GROUP BY category_id, month`,
      kind,
      from,
      to,
    ).map((row) => ({ categoryId: Number(row.category_id), month: String(row.month), total: Number(row.total) }))
  }
}

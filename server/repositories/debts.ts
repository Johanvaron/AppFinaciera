import type { DatabaseSync } from 'node:sqlite'
import type { DebtEntry, DebtEntryType, DebtKind, IsoDate } from '../../shared/contract.ts'
import { BaseRepository } from './base.ts'

export interface DebtRecord {
  id: number
  name: string
  kind: DebtKind
  initialBalance: number
  startDate: IsoDate
  fixedExpenseId: number | null
  note: string
  archived: boolean
}

export class DebtRepository extends BaseRepository<DebtRecord> {
  constructor(db: DatabaseSync) {
    super(db, 'debts', { booleans: ['archived'], orderBy: 'archived, id' })
  }

  /** The debt already linked to that fixed expense, if any. */
  byFixedExpense(fixedExpenseId: number): DebtRecord | undefined {
    return this.select('WHERE fixed_expense_id = ?', fixedExpenseId)[0]
  }
}

export type DebtEntryInsert = Omit<DebtEntry, 'id'>

export class DebtEntryRepository extends BaseRepository<DebtEntry, DebtEntryInsert> {
  constructor(db: DatabaseSync) {
    super(db, 'debt_entries', { orderBy: 'date, id' })
  }

  /** Oldest first. */
  listByDebt(debtId: number): DebtEntry[] {
    return this.select('WHERE debt_id = ? ORDER BY date, id', debtId)
  }

  /** Sums per debt of one entry type, for the list screen in a single query. */
  totalsByType(type: DebtEntryType): Map<number, number> {
    const rows = this.all('SELECT debt_id, SUM(amount) AS total FROM debt_entries WHERE type = ? GROUP BY debt_id', type)
    return new Map(rows.map((row) => [Number(row.debt_id), Number(row.total)]))
  }
}

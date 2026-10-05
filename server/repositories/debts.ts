import type { DatabaseSync } from 'node:sqlite'
import type { DebtEntry, DebtKind, IsoDate } from '../../shared/contract.ts'
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

  /** Date of the oldest entry of a debt; undefined when it has none. */
  firstDate(debtId: number): IsoDate | undefined {
    const row = this.one('SELECT MIN(date) AS first FROM debt_entries WHERE debt_id = ?', debtId)
    return row?.first == null ? undefined : String(row.first)
  }
}

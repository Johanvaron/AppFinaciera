import type { DatabaseSync } from 'node:sqlite'
import type { Month } from '../../shared/contract.ts'
import { BaseRepository } from './base.ts'

/** Per-month override of a fixed expense. */
export interface FixedMonthRecord {
  id: number
  fixedId: number
  month: Month
  /** Null = use the fixed expense's own amount. */
  expectedAmount: number | null
  skipped: boolean
}

export class FixedMonthRepository extends BaseRepository<FixedMonthRecord> {
  constructor(db: DatabaseSync) {
    super(db, 'fixed_months', { booleans: ['skipped'] })
  }

  find(fixedId: number, month: Month): FixedMonthRecord | undefined {
    return this.select('WHERE fixed_id = ? AND month = ?', fixedId, month)[0]
  }

  forMonth(month: Month): FixedMonthRecord[] {
    return this.select('WHERE month = ?', month)
  }

  deleteFor(fixedId: number): number {
    return this.run('DELETE FROM fixed_months WHERE fixed_id = ?', fixedId)
  }
}

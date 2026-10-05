import type { DatabaseSync } from 'node:sqlite'
import type { Account } from '../../shared/contract.ts'
import { BaseRepository } from './base.ts'

/** The stored part of an account; `balance` is derived from the movements. */
export type AccountRecord = Omit<Account, 'balance'>

export class AccountRepository extends BaseRepository<AccountRecord> {
  constructor(db: DatabaseSync) {
    super(db, 'accounts', { booleans: ['archived'] })
  }

  /** Account id -> balance over the whole history (integer pesos). */
  balances(): Map<number, number> {
    const rows = this.all(
      `SELECT a.id,
              a.initial_balance
              + COALESCE((SELECT SUM(CASE t.type WHEN 'income' THEN t.amount ELSE -t.amount END)
                            FROM transactions t WHERE t.account_id = a.id), 0)
              + COALESCE((SELECT SUM(t.amount)
                            FROM transactions t WHERE t.to_account_id = a.id AND t.type = 'transfer'), 0)
              AS balance
         FROM accounts a`,
    )
    return new Map(rows.map((row) => [Number(row.id), Number(row.balance)]))
  }
}

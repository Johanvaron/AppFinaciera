import type { z } from 'zod'
import type { Account, accountInputSchema } from '../../shared/contract.ts'
import { conflict, notFound } from '../lib/errors.ts'
import type { AccountRecord, AccountRepository } from '../repositories/accounts.ts'
import type { FixedExpenseRepository } from '../repositories/fixed-expenses.ts'
import type { TransactionRepository } from '../repositories/transactions.ts'

type AccountData = z.output<typeof accountInputSchema>

export class AccountService {
  private readonly accounts: AccountRepository
  private readonly transactions: TransactionRepository
  private readonly fixed: FixedExpenseRepository

  constructor(accounts: AccountRepository, transactions: TransactionRepository, fixed: FixedExpenseRepository) {
    this.accounts = accounts
    this.transactions = transactions
    this.fixed = fixed
  }

  list(): Account[] {
    const balances = this.accounts.balances()
    return this.accounts.list().map((record) => this.withBalance(record, balances))
  }

  create(data: AccountData): Account {
    return this.withBalance(this.accounts.insert(data))
  }

  update(id: number, patch: Partial<AccountData>): Account {
    const record = this.accounts.update(id, patch)
    if (!record) throw notFound('La cuenta no existe')
    return this.withBalance(record)
  }

  remove(id: number): void {
    if (!this.accounts.exists(id)) throw notFound('La cuenta no existe')
    if (this.transactions.countByAccount(id) > 0 || this.fixed.countByAccount(id) > 0) {
      throw conflict('Esta cuenta tiene movimientos o gastos fijos asociados; archívala en su lugar.')
    }
    this.accounts.delete(id)
  }

  private withBalance(record: AccountRecord, balances = this.accounts.balances()): Account {
    return { ...record, balance: balances.get(record.id) ?? record.initialBalance }
  }
}

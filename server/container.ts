/** Wires repositories and services for one database. */
import type { DatabaseSync } from 'node:sqlite'
import { transact, type Transact } from './db.ts'
import { systemClock, type Clock } from './lib/dates.ts'
import { AccountRepository } from './repositories/accounts.ts'
import { BackupRepository } from './repositories/backup.ts'
import { BudgetRepository } from './repositories/budgets.ts'
import { CategoryRepository } from './repositories/categories.ts'
import { FixedExpenseRepository } from './repositories/fixed-expenses.ts'
import { FixedMonthRepository } from './repositories/fixed-months.ts'
import { TransactionRepository } from './repositories/transactions.ts'
import { AccountService } from './services/accounts.ts'
import { BackupService } from './services/backup.ts'
import { BudgetService } from './services/budgets.ts'
import { CategoryService } from './services/categories.ts'
import { FixedService } from './services/fixed.ts'
import { ReportService } from './services/reports.ts'
import { SummaryService } from './services/summary.ts'
import { TransactionService } from './services/transactions.ts'

export interface AppOptions {
  /** Returns today's local date. Tests inject a fixed one. */
  clock?: Clock
}

export function buildServices(db: DatabaseSync, options: AppOptions = {}) {
  const clock = options.clock ?? systemClock
  const run: Transact = (fn) => transact(db, fn)

  const accountRepo = new AccountRepository(db)
  const categoryRepo = new CategoryRepository(db)
  const transactionRepo = new TransactionRepository(db)
  const fixedRepo = new FixedExpenseRepository(db)
  const fixedMonthRepo = new FixedMonthRepository(db)
  const budgetRepo = new BudgetRepository(db)

  const accounts = new AccountService(accountRepo, transactionRepo, fixedRepo)
  const fixed = new FixedService({
    fixed: fixedRepo,
    months: fixedMonthRepo,
    transactions: transactionRepo,
    categories: categoryRepo,
    accounts: accountRepo,
    transact: run,
    clock,
  })

  return {
    accounts,
    categories: new CategoryService(categoryRepo, transactionRepo, fixedRepo, budgetRepo),
    transactions: new TransactionService(transactionRepo, accountRepo, categoryRepo),
    fixed,
    budgets: new BudgetService(budgetRepo, categoryRepo, transactionRepo, clock),
    summary: new SummaryService(transactionRepo, categoryRepo, accounts, fixed, clock),
    reports: new ReportService(transactionRepo, categoryRepo, clock),
    backup: new BackupService(new BackupRepository(db), run, clock),
  }
}

export type Services = ReturnType<typeof buildServices>

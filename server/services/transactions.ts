import type { z } from 'zod'
import type {
  Transaction,
  bulkCategorizeSchema,
  transactionInputSchema,
  transactionQuerySchema,
} from '../../shared/contract.ts'
import { monthBounds } from '../lib/dates.ts'
import { invalid, notFound } from '../lib/errors.ts'
import type { AccountRepository } from '../repositories/accounts.ts'
import type { CategoryRepository } from '../repositories/categories.ts'
import type { TransactionRepository } from '../repositories/transactions.ts'

type TransactionData = z.output<typeof transactionInputSchema>
type TransactionQuery = z.output<typeof transactionQuerySchema>
type BulkCategorize = z.output<typeof bulkCategorizeSchema>

/** Lowercase and without accents, so "cafe" finds "Café". */
const fold = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

export class TransactionService {
  private readonly transactions: TransactionRepository
  private readonly accounts: AccountRepository
  private readonly categories: CategoryRepository

  constructor(transactions: TransactionRepository, accounts: AccountRepository, categories: CategoryRepository) {
    this.transactions = transactions
    this.accounts = accounts
    this.categories = categories
  }

  list(query: TransactionQuery): Transaction[] {
    // `month` wins over from/to.
    const range = query.month ? monthBounds(query.month) : { from: query.from, to: query.to }
    const rows = this.transactions.search({
      ...range,
      type: query.type,
      categoryId: query.categoryId,
      accountId: query.accountId,
    })
    if (!query.q) return rows
    const needle = fold(query.q)
    return rows.filter((row) => fold(row.description).includes(needle) || fold(row.note).includes(needle))
  }

  create(data: TransactionData): Transaction {
    this.checkReferences(data)
    return this.transactions.insert({ ...data, fixedExpenseId: null, fixedMonth: null })
  }

  /** Full replacement of the editable fields; the fixed-expense link is kept. */
  update(id: number, data: TransactionData): Transaction {
    const current = this.transactions.get(id)
    if (!current) throw notFound('El movimiento no existe')
    if (current.fixedExpenseId != null && data.type !== 'expense') {
      throw invalid({ type: 'El pago de un gasto fijo tiene que seguir siendo un gasto' })
    }
    this.checkReferences(data)
    return this.transactions.update(id, data) as Transaction
  }

  remove(id: number): void {
    if (!this.transactions.delete(id)) throw notFound('El movimiento no existe')
  }

  /** Only movements whose type matches the category kind are changed; transfers never are. */
  bulkCategorize(data: BulkCategorize): { updated: number } {
    const category = this.categories.get(data.categoryId)
    if (!category) throw invalid({ categoryId: 'La categoría no existe' })
    return { updated: this.transactions.setCategory(data.ids, category.id, category.kind) }
  }

  private checkReferences(data: TransactionData): void {
    const fields: Record<string, string> = {}
    if (!this.accounts.exists(data.accountId)) fields.accountId = 'La cuenta no existe'
    if (data.toAccountId != null && !this.accounts.exists(data.toAccountId)) {
      fields.toAccountId = 'La cuenta destino no existe'
    }
    if (data.categoryId != null) {
      const category = this.categories.get(data.categoryId)
      if (!category) fields.categoryId = 'La categoría no existe'
      else if (category.kind !== data.type) {
        fields.categoryId =
          data.type === 'income' ? 'Elige una categoría de ingresos' : 'Elige una categoría de gastos'
      }
    }
    if (Object.keys(fields).length > 0) throw invalid(fields)
  }
}

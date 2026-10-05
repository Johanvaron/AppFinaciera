import type { z } from 'zod'
import type {
  Debt,
  DebtDetail,
  DebtEntry,
  DebtMonthRow,
  DebtMovement,
  DebtsResponse,
  Transaction,
  debtEntryInputSchema,
  debtInputSchema,
  debtPatchSchema,
} from '../../shared/contract.ts'
import { isRealDate, monthOf, monthRange, type Clock } from '../lib/dates.ts'
import { invalid, notFound } from '../lib/errors.ts'
import type { DebtEntryRepository, DebtRecord, DebtRepository } from '../repositories/debts.ts'
import type { FixedExpenseRepository } from '../repositories/fixed-expenses.ts'
import type { TransactionRepository } from '../repositories/transactions.ts'

type DebtData = z.output<typeof debtInputSchema>
type DebtPatchData = z.output<typeof debtPatchSchema>
type EntryData = z.output<typeof debtEntryInputSchema>

interface DebtServiceDeps {
  debts: DebtRepository
  entries: DebtEntryRepository
  fixed: FixedExpenseRepository
  transactions: TransactionRepository
  clock: Clock
}

const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0)

/** The movements that change a debt: manual entries plus the linked fixed expense's payments since the start date. */
function movementsOf(record: DebtRecord, entries: DebtEntry[], payments: Transaction[]): DebtMovement[] {
  const lines: Omit<DebtMovement, 'balanceAfter'>[] = [
    ...entries.map((entry) => ({
      date: entry.date,
      type: entry.type,
      amount: entry.amount,
      description: entry.description,
      source: 'entry' as const,
      entryId: entry.id,
      transactionId: null,
    })),
    ...payments.map((payment) => ({
      date: payment.date,
      type: 'abono' as const,
      amount: payment.amount,
      description: payment.description,
      source: 'payment' as const,
      entryId: null,
      transactionId: payment.id,
    })),
  ]
  lines.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.entryId ?? a.transactionId ?? 0) - (b.entryId ?? b.transactionId ?? 0)))
  let balance = record.initialBalance
  return lines.map((line) => {
    balance += line.type === 'cargo' ? line.amount : -line.amount
    return { ...line, balanceAfter: balance }
  })
}

/** One row per month from the start date up to today or the last movement, whichever is later, so the last row always closes at the balance. */
function monthlyOf(record: DebtRecord, movements: DebtMovement[], today: string): DebtMonthRow[] {
  const last = movements.length > 0 ? movements[movements.length - 1]!.date : record.startDate
  const end = monthOf(last > today ? last : today)
  const months = monthRange(monthOf(record.startDate), end)
  let balance = record.initialBalance
  return months.map((month) => {
    const inMonth = movements.filter((m) => monthOf(m.date) === month)
    const paid = sum(inMonth.filter((m) => m.type === 'abono').map((m) => m.amount))
    const charged = sum(inMonth.filter((m) => m.type === 'cargo').map((m) => m.amount))
    balance += charged - paid
    return { month, paid, charged, balanceEnd: balance }
  })
}

export class DebtService {
  private readonly deps: DebtServiceDeps

  constructor(deps: DebtServiceDeps) {
    this.deps = deps
  }

  list(): DebtsResponse {
    const debts = this.deps.debts.list().map((record) => this.withTotals(record))
    const active = debts.filter((debt) => !debt.archived)
    return {
      debts,
      totalDebt: sum(active.map((debt) => debt.balance)),
      paidThisMonth: sum(active.map((debt) => debt.paidThisMonth)),
    }
  }

  get(id: number): Debt {
    return this.withTotals(this.mustGet(id))
  }

  detail(id: number): DebtDetail {
    const record = this.mustGet(id)
    const movements = this.movements(record)
    return {
      debt: this.withTotals(record, movements),
      movements: [...movements].reverse(),
      monthly: monthlyOf(record, movements, this.deps.clock()),
    }
  }

  create(data: DebtData): Debt {
    this.checkDefinition(data, null)
    return this.withTotals(this.deps.debts.insert(data))
  }

  update(id: number, patch: DebtPatchData): Debt {
    const current = this.mustGet(id)
    this.checkDefinition({ ...current, ...patch }, id)
    // Entries older than the start date would still count in the balance but fall outside the monthly rows.
    if (patch.startDate != null && patch.startDate > current.startDate) {
      const first = this.deps.entries.firstDate(id)
      if (first != null && first < patch.startDate) throw invalid({ startDate: 'Hay registros anteriores a esa fecha' })
    }
    return this.withTotals(this.deps.debts.update(id, patch) as DebtRecord)
  }

  /** Entries go with it (ON DELETE CASCADE); the fixed expense and its payments are untouched. */
  remove(id: number): void {
    if (!this.deps.debts.exists(id)) throw notFound('La deuda no existe')
    this.deps.debts.delete(id)
  }

  addEntry(id: number, data: EntryData): DebtDetail {
    const record = this.mustGet(id)
    if (!isRealDate(data.date)) throw invalid({ date: 'Esa fecha no existe en el calendario' })
    if (data.date < record.startDate) throw invalid({ date: 'La fecha es anterior al inicio de la deuda' })
    this.deps.entries.insert({ debtId: id, ...data })
    return this.detail(id)
  }

  removeEntry(id: number, entryId: number): DebtDetail {
    this.mustGet(id)
    const entry = this.deps.entries.get(entryId)
    if (!entry || entry.debtId !== id) throw notFound('El registro no existe')
    this.deps.entries.delete(entryId)
    return this.detail(id)
  }

  private checkDefinition(data: Pick<DebtData, 'startDate' | 'fixedExpenseId'>, selfId: number | null): void {
    if (!isRealDate(data.startDate)) throw invalid({ startDate: 'Esa fecha no existe en el calendario' })
    if (data.fixedExpenseId == null) return
    if (!this.deps.fixed.exists(data.fixedExpenseId)) throw invalid({ fixedExpenseId: 'El gasto fijo no existe' })
    const owner = this.deps.debts.byFixedExpense(data.fixedExpenseId)
    if (owner && owner.id !== selfId) throw invalid({ fixedExpenseId: `Ese gasto fijo ya está enlazado a "${owner.name}"` })
  }

  private movements(record: DebtRecord): DebtMovement[] {
    const payments = record.fixedExpenseId == null ? [] : this.deps.transactions.fixedPaymentsSince(record.fixedExpenseId, record.startDate)
    return movementsOf(record, this.deps.entries.listByDebt(record.id), payments)
  }

  private withTotals(record: DebtRecord, movements = this.movements(record)): Debt {
    const thisMonth = monthOf(this.deps.clock())
    const payments = movements.filter((m) => m.type === 'abono')
    const last = payments[payments.length - 1]
    return {
      ...record,
      balance: movements.length > 0 ? movements[movements.length - 1]!.balanceAfter : record.initialBalance,
      paidTotal: sum(payments.map((m) => m.amount)),
      chargedTotal: sum(movements.filter((m) => m.type === 'cargo').map((m) => m.amount)),
      paidThisMonth: sum(payments.filter((m) => monthOf(m.date) === thisMonth).map((m) => m.amount)),
      lastPaymentDate: last ? last.date : null,
    }
  }

  private mustGet(id: number): DebtRecord {
    const record = this.deps.debts.get(id)
    if (!record) throw notFound('La deuda no existe')
    return record
  }
}

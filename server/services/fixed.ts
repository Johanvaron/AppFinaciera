/** Fixed expenses: the monthly checklist. Status is always derived, never stored. */
import type { z } from 'zod'
import type {
  FixedExpense,
  FixedMonthItem,
  FixedMonthResponse,
  FixedStatus,
  Month,
  Transaction,
  fixedExpenseInputSchema,
  fixedMonthOverrideSchema,
  fixedPaySchema,
} from '../../shared/contract.ts'
import type { Transact } from '../db.ts'
import { dueDateFor, isRealDate, monthOf, type Clock } from '../lib/dates.ts'
import { conflict, invalid, notFound } from '../lib/errors.ts'
import type { AccountRepository } from '../repositories/accounts.ts'
import type { CategoryRepository } from '../repositories/categories.ts'
import type { DebtRepository } from '../repositories/debts.ts'
import type { FixedExpenseRepository } from '../repositories/fixed-expenses.ts'
import type { FixedMonthRecord, FixedMonthRepository } from '../repositories/fixed-months.ts'
import type { TransactionRepository } from '../repositories/transactions.ts'

type FixedData = z.output<typeof fixedExpenseInputSchema>
type OverrideData = z.output<typeof fixedMonthOverrideSchema>
type PayData = z.output<typeof fixedPaySchema>

export interface FixedServiceDeps {
  fixed: FixedExpenseRepository
  months: FixedMonthRepository
  transactions: TransactionRepository
  categories: CategoryRepository
  accounts: AccountRepository
  debts: DebtRepository
  transact: Transact
  clock: Clock
}

const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0)

function deriveStatus(args: {
  skipped: boolean
  paid: boolean
  dueDate: string | null
  month: Month
  today: string
}): FixedStatus {
  if (args.skipped) return 'skipped'
  if (args.paid) return 'paid'
  if (args.dueDate != null) return args.dueDate < args.today ? 'overdue' : 'pending'
  // No due day: it becomes overdue once its whole month is over.
  return args.month < monthOf(args.today) ? 'overdue' : 'pending'
}

/** Builds one checklist row. `payments` must be the ones applying to `month`, oldest first. */
export function buildFixedItem(
  fixed: FixedExpense,
  month: Month,
  override: FixedMonthRecord | undefined,
  payments: Transaction[],
  today: string,
): FixedMonthItem {
  const dueDate = dueDateFor(month, fixed.dueDay)
  const expectedAmount = override?.expectedAmount ?? fixed.amount
  const paidAmount = sum(payments.map((payment) => payment.amount))
  const status = deriveStatus({
    skipped: override?.skipped ?? false,
    // A partial payment leaves the month open; with nothing expected, any payment settles it.
    paid: payments.length > 0 && paidAmount >= expectedAmount,
    dueDate,
    month,
    today,
  })
  const lastPayment = payments[payments.length - 1]
  return {
    fixed,
    month,
    expectedAmount,
    hasOverride: override?.expectedAmount != null,
    paidAmount,
    remainingAmount: status === 'skipped' || status === 'paid' ? 0 : Math.max(expectedAmount - paidAmount, 0),
    status,
    dueDate,
    paidDate: status === 'paid' && lastPayment ? lastPayment.date : null,
    transactionIds: payments.map((payment) => payment.id),
  }
}

function totalsOf(items: FixedMonthItem[]): FixedMonthResponse['totals'] {
  const counted = items.filter((item) => item.status !== 'skipped')
  const paid = counted.filter((item) => item.status === 'paid')
  const unpaid = counted.filter((item) => item.status !== 'paid')
  const paidTotal = sum(counted.map((item) => item.paidAmount))
  const pendingTotal = sum(unpaid.map((item) => item.remainingAmount))
  return {
    expected: paidTotal + pendingTotal,
    paid: paidTotal,
    pending: pendingTotal,
    countPaid: paid.length,
    countTotal: counted.length,
  }
}

export class FixedService {
  private readonly deps: FixedServiceDeps

  constructor(deps: FixedServiceDeps) {
    this.deps = deps
  }

  /** The checklist of a month (defaults to the current one). */
  month(month: Month = monthOf(this.deps.clock())): FixedMonthResponse {
    const today = this.deps.clock()
    const overrides = new Map(this.deps.months.forMonth(month).map((record) => [record.fixedId, record]))
    const payments = new Map<number, Transaction[]>()
    for (const payment of this.deps.transactions.fixedPayments(month)) {
      const key = payment.fixedExpenseId as number
      payments.set(key, [...(payments.get(key) ?? []), payment])
    }
    const items = this.deps.fixed
      .activeIn(month)
      .map((fixed) => buildFixedItem(fixed, month, overrides.get(fixed.id), payments.get(fixed.id) ?? [], today))
    return { month, items, totals: totalsOf(items) }
  }

  create(data: FixedData): FixedExpense {
    this.checkDefinition(data)
    return this.deps.fixed.insert({ ...data, position: this.deps.fixed.maxPosition() + 1 })
  }

  update(id: number, patch: Partial<FixedData>): FixedExpense {
    const current = this.mustGet(id)
    const next = { ...current, ...patch }
    this.checkDefinition(next)
    if (next.startMonth === current.startMonth && next.endMonth === current.endMonth) {
      return this.deps.fixed.update(id, patch) as FixedExpense
    }
    this.checkPaymentsInRange(id, next)
    return this.deps.transact(() => {
      // Overrides of months that no longer apply would be unreachable leftovers.
      this.deps.months.deleteOutside(id, next.startMonth, next.endMonth)
      return this.deps.fixed.update(id, patch) as FixedExpense
    })
  }

  /** A month with payments cannot be cut out of the range: its "paid" would vanish while the movements stay. */
  private checkPaymentsInRange(id: number, range: Pick<FixedData, 'startMonth' | 'endMonth'>): void {
    const span = this.deps.transactions.fixedPaymentSpan(id)
    if (!span) return
    const fields: Record<string, string> = {}
    if (span.first < range.startMonth) fields.startMonth = 'Hay pagos registrados fuera de ese rango'
    if (range.endMonth != null && span.last > range.endMonth) fields.endMonth = 'Hay pagos registrados fuera de ese rango'
    if (Object.keys(fields).length > 0) throw invalid(fields)
  }

  /** Its payments stay as plain movements; its overrides go away. A linked debt counts those payments: unlinking them would silently raise its balance. */
  remove(id: number): void {
    this.mustGet(id)
    const debt = this.deps.debts.byFixedExpense(id)
    if (debt) throw conflict(`Ese gasto fijo está enlazado a la deuda "${debt.name}"; desenlázalo primero.`)
    this.deps.transact(() => {
      this.deps.transactions.unlinkFixed(id)
      this.deps.months.deleteFor(id)
      this.deps.fixed.delete(id)
    })
  }

  /** Rewrites positions: the given ids first, in that order; any id left out keeps its relative order after them. */
  reorder(ids: number[]): void {
    const all = this.deps.fixed.list()
    const known = new Set(all.map((fixed) => fixed.id))
    if (ids.some((id) => !known.has(id))) throw invalid({ ids: 'Hay un gasto fijo que no existe' })
    const ordered = [...new Set(ids)]
    const listed = new Set(ordered)
    for (const fixed of all) if (!listed.has(fixed.id)) ordered.push(fixed.id)
    this.deps.transact(() => {
      ordered.forEach((id, index) => this.deps.fixed.update(id, { position: index + 1 }))
    })
  }

  setOverride(id: number, month: Month, data: OverrideData): FixedMonthItem {
    const fixed = this.mustGet(id)
    this.assertApplies(fixed, month)
    // A skipped month drops out of the totals, which would hide money that was really paid.
    if (data.skipped === true && this.deps.transactions.fixedPayments(month, id).length > 0) {
      throw conflict('Este mes ya tiene un pago registrado; quita el pago antes de marcarlo como "No aplica".')
    }
    const current = this.deps.months.find(id, month)
    const expectedAmount = data.expectedAmount === undefined ? (current?.expectedAmount ?? null) : data.expectedAmount
    const skipped = data.skipped ?? current?.skipped ?? false
    if (expectedAmount === null && !skipped) {
      if (current) this.deps.months.delete(current.id)
    } else if (current) {
      this.deps.months.update(current.id, { expectedAmount, skipped })
    } else {
      this.deps.months.insert({ fixedId: id, month, expectedAmount, skipped })
    }
    return this.item(fixed, month)
  }

  /** Registers a payment for `month`; a partial one leaves it pending until the expected amount is covered. The payment date may fall in another month. */
  pay(id: number, data: PayData): FixedMonthItem {
    const fixed = this.mustGet(id)
    this.assertApplies(fixed, data.month)
    if (!isRealDate(data.date)) throw invalid({ date: 'Esa fecha no existe en el calendario' })
    if (!this.deps.accounts.exists(data.accountId)) throw invalid({ accountId: 'La cuenta no existe' })
    this.deps.transact(() => {
      this.deps.transactions.insert({
        date: data.date,
        amount: data.amount,
        type: 'expense',
        accountId: data.accountId,
        toAccountId: null,
        categoryId: fixed.categoryId,
        description: fixed.name,
        note: '',
        fixedExpenseId: fixed.id,
        fixedMonth: data.month,
      })
      // Paying a month that was marked "does not apply" means it does apply after all.
      const override = this.deps.months.find(id, data.month)
      if (override?.skipped) this.setOverride(id, data.month, { skipped: false })
    })
    return this.item(fixed, data.month)
  }

  /** Deletes every payment of that month. */
  unpay(id: number, month: Month): FixedMonthItem {
    const fixed = this.mustGet(id)
    this.assertApplies(fixed, month)
    this.deps.transactions.deleteFixedPayments(id, month)
    return this.item(fixed, month)
  }

  private item(fixed: FixedExpense, month: Month): FixedMonthItem {
    return buildFixedItem(
      fixed,
      month,
      this.deps.months.find(fixed.id, month),
      this.deps.transactions.fixedPayments(month, fixed.id),
      this.deps.clock(),
    )
  }

  private mustGet(id: number): FixedExpense {
    const fixed = this.deps.fixed.get(id)
    if (!fixed) throw notFound('El gasto fijo no existe')
    return fixed
  }

  private assertApplies(fixed: FixedExpense, month: Month): void {
    if (month < fixed.startMonth || (fixed.endMonth != null && month > fixed.endMonth)) {
      throw invalid({ month: 'Este gasto fijo no aplica para ese mes' })
    }
  }

  private checkDefinition(data: Pick<FixedData, 'categoryId' | 'accountId' | 'startMonth' | 'endMonth'>): void {
    const fields: Record<string, string> = {}
    const category = this.deps.categories.get(data.categoryId)
    if (!category) fields.categoryId = 'La categoría no existe'
    else if (category.kind !== 'expense') fields.categoryId = 'Elige una categoría de gastos'
    if (data.accountId != null && !this.deps.accounts.exists(data.accountId)) fields.accountId = 'La cuenta no existe'
    if (data.endMonth != null && data.endMonth < data.startMonth) {
      fields.endMonth = 'El mes final no puede ser anterior al inicial'
    }
    if (Object.keys(fields).length > 0) throw invalid(fields)
  }
}

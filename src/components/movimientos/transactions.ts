/**
 * Pure logic of the Movimientos screen: totals of what is on screen, how a
 * movement reads in a row, sorting, day grouping and the bulk-category rule.
 */
import type { Account, Category, CategoryColor, CategoryKind, IsoDate, Transaction, TransactionType } from '@shared/contract'
import type { TransactionFilters } from '@/lib/api'
import { dateLong, dateShort, formatMoney } from '@/lib/format'

export interface FilteredTotals {
  income: number
  expenses: number
  /** income - expenses. Can be negative. */
  net: number
  count: number
}

/** Totals of the visible rows. Transfers move money between accounts: they are neither income nor expense. */
export function filteredTotals(transactions: Transaction[]): FilteredTotals {
  let income = 0
  let expenses = 0
  for (const tx of transactions) {
    if (tx.type === 'income') income += tx.amount
    else if (tx.type === 'expense') expenses += tx.amount
  }
  return { income, expenses, net: income - expenses, count: transactions.length }
}

/**
 * Red is an alert: the month went negative. With a type or category filter one side
 * is left out of the list, so that net compares nothing and is never an alert.
 */
export function netClass(net: number, filters: TransactionFilters): string {
  const comparesBothSides = filters.type == null && filters.categoryId == null
  return net < 0 && comparesBothSides ? 'text-danger' : ''
}

export interface TotalsText {
  income: string
  expenses: string
  net: string
  count: string
}

const NO_DATA = '—'

/** What the totals strip reads. Without an answer from the server (loading or failed) there is no figure to show, not a zero. */
export function totalsText(totals: FilteredTotals | null): TotalsText {
  if (!totals) return { income: NO_DATA, expenses: NO_DATA, net: NO_DATA, count: NO_DATA }
  return {
    income: formatMoney(totals.income),
    expenses: formatMoney(totals.expenses),
    net: formatMoney(totals.net),
    count: countLabel(totals.count),
  }
}

/** 1 -> "1 movimiento", 12 -> "12 movimientos". */
export function countLabel(count: number): string {
  return count === 1 ? '1 movimiento' : `${count} movimientos`
}

/** Income "+$ 1.250.000", expense "-$ 78.000", transfer "$ 300.000" (no sign). */
export function amountText(type: TransactionType, amount: number): string {
  const money = formatMoney(amount)
  if (type === 'income') return `+${money}`
  if (type === 'expense') return `-${money}`
  return money
}

/** Income is green, expense stays in ink (never red), transfer is muted. */
export function amountClass(type: TransactionType): string {
  if (type === 'income') return 'text-success'
  if (type === 'expense') return 'text-ink'
  return 'text-muted'
}

export type SortKey = 'date' | 'amount'
export type SortDir = 'asc' | 'desc'

/** Newest first, and the last one created first within a day (same order the API uses). */
function byDateDesc(a: Transaction, b: Transaction): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1
  return b.id - a.id
}

/** Returns a sorted copy. Amount sorts by size (the sign is not part of it); ties go newest first. */
export function sortTransactions(transactions: Transaction[], key: SortKey, dir: SortDir): Transaction[] {
  const factor = dir === 'desc' ? 1 : -1
  return [...transactions].sort((a, b) => {
    if (key === 'amount' && a.amount !== b.amount) return (b.amount - a.amount) * factor
    if (key === 'amount') return byDateDesc(a, b)
    return byDateDesc(a, b) * factor
  })
}

export interface DayGroup {
  date: IsoDate
  /** "2 de octubre de 2026" */
  label: string
  /** Sum of that day's expenses (income and transfers are left out). */
  spent: number
  items: Transaction[]
}

/** Groups consecutive rows of the same date. Expects rows already sorted by date. */
export function groupByDay(transactions: Transaction[]): DayGroup[] {
  const groups: DayGroup[] = []
  for (const tx of transactions) {
    let group = groups[groups.length - 1]
    if (!group || group.date !== tx.date) {
      group = { date: tx.date, label: dateLong(tx.date), spent: 0, items: [] }
      groups.push(group)
    }
    group.items.push(tx)
    if (tx.type === 'expense') group.spent += tx.amount
  }
  return groups
}

export interface RowView {
  /** Description, or the category name (or "Transferencia") when it is empty. */
  title: string
  isFixed: boolean
  note: string
  categoryName: string
  /** Null for transfers (no color dot). */
  categoryColor: CategoryColor | null
  /** Account name; "Origen → Destino" for transfers. */
  accountText: string
  amountText: string
  amountClass: string
  dateText: string
}

const UNKNOWN_CATEGORY = 'Sin categoría'
const UNKNOWN_ACCOUNT = 'Cuenta eliminada'

/** Everything a row shows, already as text. */
export function rowView(tx: Transaction, categories: Map<number, Category>, accounts: Map<number, Account>): RowView {
  const isTransfer = tx.type === 'transfer'
  const category = tx.categoryId == null ? undefined : categories.get(tx.categoryId)
  const categoryName = isTransfer ? 'Transferencia' : (category?.name ?? UNKNOWN_CATEGORY)
  const accountName = (id: number | null) => (id == null ? UNKNOWN_ACCOUNT : (accounts.get(id)?.name ?? UNKNOWN_ACCOUNT))
  return {
    title: tx.description.trim() || categoryName,
    isFixed: tx.fixedExpenseId != null,
    note: tx.note.trim(),
    categoryName,
    categoryColor: isTransfer ? null : (category?.color ?? 'slate'),
    accountText: isTransfer ? `${accountName(tx.accountId)} → ${accountName(tx.toAccountId)}` : accountName(tx.accountId),
    amountText: amountText(tx.type, tx.amount),
    amountClass: amountClass(tx.type),
    dateText: dateShort(tx.date),
  }
}

export interface BulkCategoryRule {
  /** Kind of category that can be applied; null when none can. */
  kind: CategoryKind | null
  /** Why it cannot be applied ('' when it can). */
  reason: string
}

/** A category only fits movements of its own kind, and transfers carry none. */
export function bulkCategoryRule(selected: Transaction[]): BulkCategoryRule {
  if (selected.length === 0) return { kind: null, reason: '' }
  if (selected.some((tx) => tx.type === 'transfer')) return { kind: null, reason: 'Las transferencias no llevan categoría: quítalas de la selección.' }
  const hasIncome = selected.some((tx) => tx.type === 'income')
  const hasExpense = selected.some((tx) => tx.type === 'expense')
  if (hasIncome && hasExpense) return { kind: null, reason: 'La selección mezcla ingresos y gastos: elige solo de un tipo.' }
  return { kind: hasIncome ? 'income' : 'expense', reason: '' }
}

/** Categories that can be applied to the whole selection (same kind, not archived). */
export function applicableCategories(selected: Transaction[], categories: Category[]): Category[] {
  const { kind } = bulkCategoryRule(selected)
  if (!kind) return []
  return categories.filter((c) => c.kind === kind && !c.archived)
}

export interface BulkDeleteResult {
  deleted: number
  failed: number
}

/**
 * Deletes one by one and waits for ALL of them, so a failure in the middle never hides
 * what was already deleted. A 404 counts as deleted (it is gone, which is what was asked).
 * Throws only when nothing at all could be deleted.
 */
export async function removeEach(ids: number[], remove: (id: number) => Promise<unknown>): Promise<BulkDeleteResult> {
  const results = await Promise.allSettled(ids.map((id) => remove(id)))
  const errors = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected' && (r.reason as { status?: number } | null)?.status !== 404)
  if (ids.length > 0 && errors.length === ids.length) throw errors[0]!.reason
  return { deleted: ids.length - errors.length, failed: errors.length }
}

/** Toast after deleting: "Movimiento eliminado", "3 movimientos eliminados" or what was left undone. */
export function deleteResultText({ deleted, failed }: BulkDeleteResult): string {
  if (failed > 0) return `Eliminados ${deleted} de ${deleted + failed} movimientos. Faltó eliminar ${failed}: intenta de nuevo.`
  return deleted === 1 ? 'Movimiento eliminado' : `${deleted} movimientos eliminados`
}

/** Toast after a bulk category change, with the count the server really changed. */
export function categorizedText(updated: number): string {
  if (updated === 0) return 'Ningún movimiento cambió de categoría'
  return updated === 1 ? 'Categoría actualizada en 1 movimiento' : `Categoría actualizada en ${updated} movimientos`
}

/** Text of the delete confirmation; warns when fixed-expense payments are involved. */
export function deleteWarning(transactions: Transaction[]): { question: string; fixedNotice: string } {
  const count = transactions.length
  const fixed = transactions.filter((tx) => tx.fixedExpenseId != null).length
  const question = count === 1 ? '¿Eliminar este movimiento? No se puede deshacer.' : `¿Eliminar ${count} movimientos? No se puede deshacer.`
  let fixedNotice = ''
  // A fixed expense stays paid while it keeps any payment of that month (partial payments exist).
  if (fixed > 0 && count === 1) fixedNotice = 'Es el pago de un gasto fijo: si no le queda otro pago en su mes, ese gasto fijo volverá a quedar pendiente.'
  else if (fixed === 1) fixedNotice = '1 es el pago de un gasto fijo: si no le queda otro pago en su mes, ese gasto fijo volverá a quedar pendiente.'
  else if (fixed > 1) fixedNotice = `${fixed} son pagos de gastos fijos: los que queden sin ningún pago en su mes volverán a quedar pendientes.`
  return { question, fixedNotice }
}

/**
 * Pure logic of the fixed-expenses checklist: every text and figure a row
 * shows is decided here so it can be tested without mounting anything.
 */
import type { FixedMonthItem, FixedStatus, Month } from '@shared/contract'
import { dateShort, daysUntil, formatMoney, monthLabel, parseMoney, todayIso } from '@/lib/format'

export type BadgeTone = 'success' | 'neutral' | 'danger'

const STATUS_TONES: Record<FixedStatus, BadgeTone> = {
  paid: 'success',
  pending: 'neutral',
  overdue: 'danger',
  skipped: 'neutral',
}

export function statusTone(status: FixedStatus): BadgeTone {
  return STATUS_TONES[status]
}

type DueFields = Pick<FixedMonthItem, 'status' | 'dueDate' | 'paidDate'>

/** The date line under the name. `danger` paints it red (only when overdue). */
export function dueText(item: DueFields, today = todayIso()): { text: string; danger: boolean } {
  if (item.status === 'paid') {
    return { text: item.paidDate ? `Pagado el ${dateShort(item.paidDate)}` : 'Pagado', danger: false }
  }
  if (item.status === 'skipped') return { text: '', danger: false }
  if (!item.dueDate) return { text: item.status === 'overdue' ? 'Vencido' : 'Sin fecha de pago', danger: item.status === 'overdue' }
  const days = daysUntil(item.dueDate, today)
  if (item.status === 'overdue') {
    const late = -days
    if (late <= 0) return { text: 'Vencido', danger: true }
    return { text: late === 1 ? 'Venció ayer' : `Venció hace ${late} días`, danger: true }
  }
  if (days === 0) return { text: 'Vence hoy', danger: false }
  return { text: `Vence ${dateShort(item.dueDate)}`, danger: false }
}

type AmountFields = Pick<FixedMonthItem, 'status' | 'expectedAmount' | 'paidAmount'> & {
  fixed: Pick<FixedMonthItem['fixed'], 'variableAmount'>
}

/** Unpaid item whose amount changes every month and nobody has typed it yet. */
export function needsAmount(item: AmountFields): boolean {
  return (item.status === 'pending' || item.status === 'overdue') && item.fixed.variableAmount && item.expectedAmount === 0
}

/**
 * What the text of a money field holds. `UiMoneyInput` gives null both for an
 * empty field and for text that is not an amount ("40o000"), and only the
 * first one may ever mean "no amount": the second must never be saved.
 */
export function amountEntry(text: string): 'empty' | 'invalid' | 'ok' {
  if (text.trim() === '') return 'empty'
  return parseMoney(text) == null ? 'invalid' : 'ok'
}

/**
 * Caveat under the month totals: rows that still need an amount add 0 to
 * "Total del mes" and "Falta por pagar". Null when every row has one.
 */
export function undefinedAmountNote(count: number): string | null {
  return count > 0 ? `Sin contar ${count} con monto por definir` : null
}

/** What is still owed of the month: the expected amount minus the partial payments, never negative. */
export function remainingAmount(item: Pick<FixedMonthItem, 'expectedAmount' | 'paidAmount'>): number {
  return Math.max(item.expectedAmount - item.paidAmount, 0)
}

/** Pesos shown on the row: what was paid when paid, else what is still owed. */
export function rowAmount(item: AmountFields): number {
  return item.status === 'paid' ? item.paidAmount : remainingAmount(item)
}

/** "Abonado $ X de $ Y" for an unpaid row with partial payments; null when there are none. */
export function partialText(item: Pick<FixedMonthItem, 'status' | 'expectedAmount' | 'paidAmount'>): string | null {
  if (item.status === 'paid' || item.paidAmount <= 0) return null
  return `Abonado ${formatMoney(item.paidAmount)} de ${formatMoney(item.expectedAmount)}`
}

/** Text of the amount cell. Null means "show the 'Poner monto' action instead". */
export function rowAmountText(item: AmountFields): string | null {
  if (needsAmount(item)) return null
  if (item.status === 'skipped' && item.expectedAmount === 0) return '—'
  return formatMoney(rowAmount(item))
}

/** Label of the action that drops this month's own amount. */
export function resetOverrideLabel(baseAmount: number): string {
  return baseAmount > 0 ? `Volver a ${formatMoney(baseAmount)}` : 'Quitar monto'
}

/** Ids after moving one up (-1) or down (+1). Null when it cannot move. */
export function moveId(ids: readonly number[], id: number, direction: -1 | 1): number[] | null {
  const from = ids.indexOf(id)
  const to = from + direction
  if (from < 0 || to < 0 || to >= ids.length) return null
  const next = [...ids]
  next[from] = next[to]!
  next[to] = id
  return next
}

/**
 * Splits a 422's field errors: the ones a form paints next to a control, and
 * one general message with the rest (e.g. `month` when the fixed expense does
 * not apply to that month) so no server error stays invisible.
 */
export function splitFieldErrors(fields: Record<string, string>, visible: readonly string[]): { fields: Record<string, string>; rest: string } {
  const shown: Record<string, string> = {}
  const rest: string[] = []
  for (const [field, message] of Object.entries(fields)) {
    if (visible.includes(field)) shown[field] = message
    else rest.push(message)
  }
  return { fields: shown, rest: rest.join('. ') }
}

/**
 * Toast of a write made straight from the row, where no form is on screen: the
 * reason each field was rejected, not the server's generic "check the form".
 */
export function writeErrorText(fields: Record<string, string>, fallback: string): string {
  return Object.values(fields).join('. ') || fallback
}

/** Toast when "Terminar desde el mes siguiente" is rejected: from a row, `endMonth` only fails because of a payment after that month. */
export function endErrorText(fields: Record<string, string>, month: Month, fallback: string): string {
  if (fields.endMonth) return `No se puede terminar en ${monthLabel(month).toLowerCase()}: hay pagos registrados en meses posteriores`
  return writeErrorText(fields, fallback)
}

/** Start of the "undo payment" sentence; the amount follows it. Unpaying deletes EVERY payment of the month. */
export function unpayLead(paymentCount: number): string {
  return paymentCount > 1 ? `Se borran los ${paymentCount} abonos de este mes, que suman` : 'Se borra el pago de'
}

/** End of that sentence: a paid row goes back to pending, a partly paid one owes the whole amount again. */
export function unpayTail(item: Pick<FixedMonthItem, 'status' | 'expectedAmount'>): string {
  return item.status === 'paid' ? 'y vuelve a quedar pendiente.' : `y vuelve a faltar todo: ${formatMoney(item.expectedAmount)}.`
}

/** "3 de 8" for the progress figure. */
export function progressText(countPaid: number, countTotal: number): string {
  return `${countPaid} de ${countTotal}`
}

export function progressRatio(countPaid: number, countTotal: number): number | null {
  return countTotal > 0 ? countPaid / countTotal : null
}

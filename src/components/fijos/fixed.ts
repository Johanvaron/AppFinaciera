/**
 * Pure logic of the fixed-expenses checklist: every text and figure a row
 * shows is decided here so it can be tested without mounting anything.
 */
import type { FixedMonthItem, FixedStatus } from '@shared/contract'
import { dateShort, daysUntil, formatMoney, todayIso } from '@/lib/format'

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

/** Pesos shown on the row: what was paid when paid, else what is expected. */
export function rowAmount(item: AmountFields): number {
  return item.status === 'paid' ? item.paidAmount : item.expectedAmount
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

/** "3 de 8" for the progress figure. */
export function progressText(countPaid: number, countTotal: number): string {
  return `${countPaid} de ${countTotal}`
}

export function progressRatio(countPaid: number, countTotal: number): number | null {
  return countTotal > 0 ? countPaid / countTotal : null
}

/**
 * Pure logic of the debts screen: every text and figure a row, the totals
 * and the detail show is decided here so it can be tested without mounting.
 */
import type { Debt, DebtInput, DebtMonthRow, DebtMovement, DebtPatch } from '@shared/contract'
import { dateShort, formatMoney } from '@/lib/format'

export type Tone = 'success' | 'danger' | 'warning' | 'neutral'

/** Text class of each tone, shared by every figure of the screen. */
export const TONE_TEXT: Record<Tone, string> = { success: 'text-success', danger: 'text-danger', warning: 'text-warning', neutral: 'text-ink' }

type BalanceFields = Pick<Debt, 'balance'>

/**
 * The big figure at the right of a row. A debt at zero is paid; one under zero
 * was overpaid, and that money is real, so it shows as a figure in favor
 * instead of collapsing into "Pagada".
 */
export function balanceText(debt: BalanceFields): { text: string; tone: Tone } {
  if (debt.balance > 0) return { text: formatMoney(debt.balance), tone: 'danger' }
  if (debt.balance < 0) return { text: `Saldo a favor ${formatMoney(-debt.balance)}`, tone: 'success' }
  return { text: 'Pagada', tone: 'success' }
}

/** Headline figure: what is owed across every active debt. */
export function totalDebtStat(totalDebt: number): { value: string; tone: Tone } {
  if (totalDebt > 0) return { value: formatMoney(totalDebt), tone: 'danger' }
  return { value: 'Sin deudas', tone: 'success' }
}

/**
 * What is owed across the active debts, computed from the rows on screen so the
 * headline always agrees with them. The API's `totalDebt` adds raw balances, so
 * an overpaid debt (negative) hides what is still owed on another one: a saldo
 * a favor on one card does not pay the loan next to it.
 */
export function headlineTotal(debts: ReadonlyArray<Pick<Debt, 'balance' | 'archived'>>): { value: string; tone: Tone } {
  const owed = debts.filter((d) => !d.archived).reduce((sum, d) => sum + Math.max(d.balance, 0), 0)
  return totalDebtStat(owed)
}

type ProgressFields = Pick<Debt, 'initialBalance' | 'chargedTotal' | 'paidTotal'>

/**
 * Paid since the start over everything that was ever owed (initial + charges).
 * Over 1 when more was paid than owed; null when nothing was ever owed.
 */
export function progressRatio(debt: ProgressFields): number | null {
  const owed = debt.initialBalance + debt.chargedTotal
  if (owed <= 0) return null
  return debt.paidTotal / owed
}

export function paidThisMonthText(debt: Pick<Debt, 'paidThisMonth'>): string {
  return debt.paidThisMonth > 0 ? `Pagaste ${formatMoney(debt.paidThisMonth)} este mes` : 'Sin pagos este mes'
}

export function lastPaymentText(debt: Pick<Debt, 'lastPaymentDate'>): string | null {
  return debt.lastPaymentDate ? `Último pago: ${dateShort(debt.lastPaymentDate)}` : null
}

/**
 * Line under the name of a linked debt. The fixed expense's name comes from
 * the current month's checklist; a fixed expense that no longer applies this
 * month is not there, so the line falls back to a generic one.
 */
export function linkText(fixedExpenseId: number | null, fixedName: string | undefined): string | null {
  if (fixedExpenseId == null) return null
  return fixedName ? `Se descuenta sola con «${fixedName}»` : 'Enlazada a un gasto fijo'
}

type MovementFields = Pick<DebtMovement, 'type' | 'amount' | 'source' | 'description'>

/** Signed amount of a history line: a charge raises the debt (+), a payment lowers it (-). */
export function movementAmountText(movement: Pick<DebtMovement, 'type' | 'amount'>): string {
  const sign = movement.type === 'cargo' ? '+' : '-'
  return `${sign}${formatMoney(movement.amount)}`
}

export function movementTone(type: DebtMovement['type']): Tone {
  return type === 'cargo' ? 'warning' : 'success'
}

/** Short label of the line: what the person typed, or what the line is when nothing was typed. */
export function movementText(movement: MovementFields): string {
  if (movement.description) return movement.description
  if (movement.source === 'payment') return 'Pago del gasto fijo'
  return movement.type === 'cargo' ? 'Cargo' : 'Abono'
}

/** Width of each month's bar in the monthly chart: its closing balance over the highest one. */
export function monthBarRatio(row: Pick<DebtMonthRow, 'balanceEnd'>, rows: ReadonlyArray<Pick<DebtMonthRow, 'balanceEnd'>>): number {
  const top = Math.max(0, ...rows.map((r) => r.balanceEnd))
  if (top <= 0 || row.balanceEnd <= 0) return 0
  return row.balanceEnd / top
}

/** What the debt form holds. */
export interface DebtFormValues {
  name: string
  kind: Debt['kind']
  initialBalance: number
  startDate: string
  fixedExpenseId: number | null
  note: string
}

export function formValues(debt: Debt): DebtFormValues {
  return {
    name: debt.name,
    kind: debt.kind,
    initialBalance: debt.initialBalance,
    startDate: debt.startDate,
    fixedExpenseId: debt.fixedExpenseId,
    note: debt.note,
  }
}

/** Body of the PATCH when editing: only the fields that differ from the saved debt. */
export function debtPatch(original: Debt, values: DebtFormValues): DebtPatch {
  const patch: DebtPatch = {}
  const saved = formValues(original)
  for (const key of Object.keys(values) as Array<keyof DebtFormValues>) {
    if (values[key] !== saved[key]) (patch as Record<string, unknown>)[key] = values[key]
  }
  return patch
}

/** Body of the POST when creating. */
export function debtBody(values: DebtFormValues): DebtInput {
  return { ...values }
}

/** Active debts first (the API already orders them so), split for the two sections of the list. */
export function splitDebts(debts: readonly Debt[]): { active: Debt[]; archived: Debt[] } {
  return { active: debts.filter((d) => !d.archived), archived: debts.filter((d) => d.archived) }
}

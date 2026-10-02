/**
 * Pure logic of the budget screen: grouping, order, the texts a person reads
 * on each row, and what gets sent when a cap is edited in place.
 */
import {
  budgetInputSchema,
  CATEGORY_GROUP_LABELS,
  CATEGORY_GROUPS,
  type BudgetInput,
  type BudgetMonthResponse,
  type BudgetRow,
  type BudgetState,
  type CategoryGroup,
  type Month,
} from '@shared/contract'
import { formatMoney, parseMoney } from '@/lib/format'

export type BudgetTone = 'success' | 'warning' | 'danger' | 'neutral'

/**
 * Groups in the order they are listed: the expense ones first, then any other
 * group of the contract. The server accepts an expense category in any group,
 * so none is left out: every row the totals count must be on the list.
 */
const EXPENSE_GROUPS: readonly CategoryGroup[] = ['fijos', 'variables', 'ahorro']
export const BUDGET_GROUPS: readonly CategoryGroup[] = [...EXPENSE_GROUPS, ...CATEGORY_GROUPS.filter((group) => !EXPENSE_GROUPS.includes(group))]

export interface BudgetGroup {
  group: CategoryGroup
  label: string
  rows: BudgetRow[]
  /** Sum of the caps set in the group. */
  budget: number
  /** Sum of everything spent in the group, with or without cap. */
  spent: number
  /** Spent in the capped categories only: the figure that compares against `budget`. */
  cappedSpent: number
  hasBudget: boolean
}

const TONES: Record<BudgetState, BudgetTone> = { ok: 'success', warning: 'warning', over: 'danger', none: 'neutral' }

export function stateTone(state: BudgetState): BudgetTone {
  return TONES[state]
}

/** Same thresholds the server uses per row, for the overall bar. */
export function ratioState(ratio: number | null): BudgetState {
  if (ratio == null) return 'none'
  if (ratio > 1) return 'over'
  if (ratio >= 0.8) return 'warning'
  return 'ok'
}

/**
 * Spending that counts against the caps. `totals.spent` is ALL the month's
 * expenses (capped or not), while `totals.remaining` only discounts the capped
 * categories, so this is the figure that matches "Disponible".
 */
export function budgetedSpent(totals: BudgetMonthResponse['totals']): number {
  return totals.budget - totals.remaining
}

/** Capped spending over budget as a fraction; null when nothing is budgeted. */
export function overallRatio(totals: BudgetMonthResponse['totals']): number | null {
  return totals.budget > 0 ? budgetedSpent(totals) / totals.budget : null
}

/** Line under "Gastado" when part of the spending is in categories without cap. */
export function spentDetail(totals: BudgetMonthResponse['totals']): string | undefined {
  const capped = budgetedSpent(totals)
  return capped === totals.spent ? undefined : `${formatMoney(capped)} en categorías con tope`
}

/** Fill of the row bar. A cap of $ 0 has no ratio: any spending fills it. */
export function barRatio(row: Pick<BudgetRow, 'ratio' | 'state'>): number | null {
  return row.ratio ?? (row.state === 'over' ? 1 : null)
}

export function hasAnyBudget(rows: BudgetRow[]): boolean {
  return rows.some((row) => row.budget != null)
}

/** The line under the bar: "Te quedan $ 120.000", "Te pasaste por $ 35.000"... */
export function statusText(row: Pick<BudgetRow, 'budget' | 'spent'>): string {
  if (row.budget == null) return 'Sin tope'
  const remaining = row.budget - row.spent
  if (remaining > 0) return `Te quedan ${formatMoney(remaining)}`
  if (remaining < 0) return `Te pasaste por ${formatMoney(-remaining)}`
  return 'Justo en el tope'
}

export function isOver(row: Pick<BudgetRow, 'budget' | 'spent'>): boolean {
  return row.budget != null && row.spent > row.budget
}

/** 0 = has a cap, 1 = no cap but has spending, 2 = the rest. */
function tier(row: BudgetRow): number {
  if (row.budget != null) return 0
  return row.spent > 0 ? 1 : 2
}

/** A cap of $ 0 has no ratio: with spending it is the most exceeded of all. */
function sortRatio(row: BudgetRow): number {
  if (row.ratio != null) return row.ratio
  return row.spent > 0 ? Number.POSITIVE_INFINITY : 0
}

function byName(a: BudgetRow, b: BudgetRow): number {
  return a.category.name.localeCompare(b.category.name, 'es')
}

/** Capped rows by ratio desc, then uncapped with spending by spent desc, then the rest by name. */
export function compareRows(a: BudgetRow, b: BudgetRow): number {
  const tierA = tier(a)
  const tierB = tier(b)
  if (tierA !== tierB) return tierA - tierB
  if (tierA === 0) {
    const ratioA = sortRatio(a)
    const ratioB = sortRatio(b)
    if (ratioA !== ratioB) return ratioA > ratioB ? -1 : 1
  }
  if (tierA === 1 && a.spent !== b.spent) return b.spent - a.spent
  return byName(a, b)
}

/**
 * Rows split by group (empty groups are left out, rows never are). `frozenOrder` is a list of
 * category ids: while someone is filling caps in a row, the list keeps that
 * order instead of jumping around after each save.
 */
export function groupRows(rows: BudgetRow[], frozenOrder?: number[] | null): BudgetGroup[] {
  const position = new Map((frozenOrder ?? []).map((id, index) => [id, index]))
  const compare = (a: BudgetRow, b: BudgetRow) => {
    const posA = position.get(a.category.id)
    const posB = position.get(b.category.id)
    if (posA != null && posB != null) return posA - posB
    if (posA != null) return -1
    if (posB != null) return 1
    return compareRows(a, b)
  }
  return BUDGET_GROUPS.map((group) => {
    const groupRowsSorted = rows.filter((row) => row.category.group === group).sort(compare)
    return {
      group,
      label: CATEGORY_GROUP_LABELS[group],
      rows: groupRowsSorted,
      budget: groupRowsSorted.reduce((sum, row) => sum + (row.budget ?? 0), 0),
      spent: groupRowsSorted.reduce((sum, row) => sum + row.spent, 0),
      cappedSpent: groupRowsSorted.reduce((sum, row) => sum + (row.budget != null ? row.spent : 0), 0),
      hasBudget: hasAnyBudget(groupRowsSorted),
    }
  }).filter((group) => group.rows.length > 0)
}

/**
 * Group header figure: "$ 850.000 de $ 1.200.000" (capped spending over the
 * caps, like the overall bar), or "$ 850.000 gastado" without caps.
 */
export function groupSubtotalText(group: Pick<BudgetGroup, 'budget' | 'spent' | 'cappedSpent' | 'hasBudget'>): string {
  return group.hasBudget ? `${formatMoney(group.cappedSpent)} de ${formatMoney(group.budget)}` : `${formatMoney(group.spent)} gastado`
}

/** Spending of the group left out of the subtotal because its category has no cap. */
export function groupUncappedText(group: Pick<BudgetGroup, 'spent' | 'cappedSpent' | 'hasBudget'>): string | undefined {
  const uncapped = group.spent - group.cappedSpent
  return group.hasBudget && uncapped > 0 ? `+ ${formatMoney(uncapped)} sin tope` : undefined
}

/** How an in-place edit was closed. */
export type CommitVia = 'enter' | 'blur' | 'next' | 'previous'

export type BudgetEdit = { kind: 'noop' } | { kind: 'invalid' } | { kind: 'save'; input: BudgetInput }

/**
 * What to do with the text left in the cap input. Empty removes the cap
 * (amount null), the same value does nothing, and text that is not money is
 * invalid (it must never be read as "remove").
 */
export function resolveBudgetEdit(current: number | null, text: string, categoryId: number, month: Month): BudgetEdit {
  const empty = text.trim() === ''
  const amount = empty ? null : parseMoney(text)
  if (!empty && amount == null) return { kind: 'invalid' }
  if (amount === current) return { kind: 'noop' }
  const parsed = budgetInputSchema.safeParse({ categoryId, month, amount })
  return parsed.success ? { kind: 'save', input: parsed.data } : { kind: 'invalid' }
}

/** The editable row before or after this one, following the order on screen. */
export function neighborId(orderedIds: number[], currentId: number, step: 1 | -1): number | null {
  const index = orderedIds.indexOf(currentId)
  if (index === -1) return null
  return orderedIds[index + step] ?? null
}

/**
 * Pure logic of the Resumen screen: every text and figure the owner reads is
 * built here so it can be tested without mounting anything.
 */
import type { Category, CategoryTotal, FixedMonthItem, IsoDate, Month, MonthSummary, Transaction } from '@shared/contract'
import { currentMonth, dateShort, daysUntil, formatChange, formatMoney, formatPercent, monthLabel, todayIso } from '@/lib/format'

export type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral'

// ---------- spending pace ----------
export interface Pace {
  /** Spent up to today (or the whole month once it is over). */
  spent: number
  /** What the previous month had spent by the same day (its total for a closed month). Null without data. */
  previousAtSameDay: number | null
  /** The previous month has spending, so its line is worth drawing. */
  previousHasData: boolean
  text: string
}

type PaceInput = Pick<MonthSummary, 'daily' | 'previousDailyCumulative' | 'expenses'> & { previous: Pick<MonthSummary['previous'], 'month'> }

/**
 * Current month: "Llevas $ X gastados hasta hoy (más $ Z con fecha posterior); a esta altura del mes pasado ibas en $ Y".
 * Closed month: "Gastaste $ X; en septiembre gastaste $ Y" (whole months).
 * Month that has not started: no pace to talk about yet.
 */
export function paceSummary(summary: PaceInput, today: IsoDate = todayIso()): Pace {
  const { daily, previousDailyCumulative: previous } = summary
  let lastIndex = -1
  daily.forEach((point, index) => {
    if (point.cumulative != null) lastIndex = index
  })
  const previousTotal = previous.length > 0 ? previous[previous.length - 1]! : 0
  const previousHasData = previousTotal > 0

  if (lastIndex < 0) {
    const text = summary.expenses > 0 ? `Este mes aún no empieza; ya tienes ${formatMoney(summary.expenses)} en gastos con fecha futura` : 'Este mes aún no empieza'
    return { spent: 0, previousAtSameDay: null, previousHasData, text }
  }

  const spent = daily[lastIndex]!.cumulative!
  const closed = daily[daily.length - 1]!.date < today
  if (closed) {
    const lead = `Gastaste ${formatMoney(spent)}`
    const text = previousHasData ? `${lead}; en ${monthNameLower(summary.previous.month)} gastaste ${formatMoney(previousTotal)}` : lead
    return { spent, previousAtSameDay: previousHasData ? previousTotal : null, previousHasData, text }
  }

  // Day 31 against a 30-day month compares with that month's last day.
  const previousAtSameDay = previousHasData ? previous[Math.min(lastIndex, previous.length - 1)]! : null
  // `expenses` covers the whole month; what is dated after today is named apart so this adds up with the Gastos card.
  const later = summary.expenses - spent
  const lead = `Llevas ${formatMoney(spent)} gastados hasta hoy` + (later > 0 ? ` (más ${formatMoney(later)} con fecha posterior)` : '')
  const text = previousAtSameDay == null ? lead : `${lead}; a esta altura del mes pasado ibas en ${formatMoney(previousAtSameDay)}`
  return { spent, previousAtSameDay, previousHasData, text }
}

/** Chart series: one slot per day of the longest of both months. */
export function paceSeries(summary: Pick<MonthSummary, 'daily' | 'previousDailyCumulative'>) {
  const length = Math.max(summary.daily.length, summary.previousDailyCumulative.length)
  const labels = Array.from({ length }, (_, index) => String(index + 1))
  const current = labels.map((_, index) => summary.daily[index]?.cumulative ?? null)
  const previous = labels.map((_, index) => summary.previousDailyCumulative[index] ?? null)
  return { labels, current, previous }
}

// ---------- categories ----------
export interface CategoryBar {
  key: string
  name: string
  /** Null for the "Otras" group. */
  category: Category | null
  total: number
  /** Width of the bar against the biggest row, as a fraction. */
  ratio: number
  amountText: string
  shareText: string
}

export const MAX_CATEGORY_BARS = 8

/** Biggest first; beyond `max` rows the rest collapse into "Otras". */
export function categoryBars(totals: CategoryTotal[], max = MAX_CATEGORY_BARS): CategoryBar[] {
  const sorted = totals.filter((row) => row.total > 0).sort((a, b) => b.total - a.total)
  // A lone leftover is shown as itself: "Otras" with one category hides its name for nothing.
  const head = sorted.length <= max + 1 ? sorted : sorted.slice(0, max)
  const rest = sorted.slice(head.length)

  const rows = head.map((row) => ({ key: `c${row.category.id}`, name: row.category.name, category: row.category as Category | null, total: row.total, share: row.share }))
  if (rest.length > 0) {
    rows.push({
      key: 'others',
      name: 'Otras',
      category: null,
      total: rest.reduce((sum, row) => sum + row.total, 0),
      share: rest.reduce((sum, row) => sum + row.share, 0),
    })
  }

  const biggest = Math.max(0, ...rows.map((row) => row.total))
  return rows.map((row) => ({
    key: row.key,
    name: row.name,
    category: row.category,
    total: row.total,
    ratio: biggest > 0 ? row.total / biggest : 0,
    amountText: formatMoney(row.total),
    shareText: formatPercent(row.share),
  }))
}

// ---------- stat cards ----------
/** "2026-09" -> "septiembre" */
export function monthNameLower(month: Month): string {
  return monthLabel(month).split(' ')[0]!.toLowerCase()
}

/**
 * "+10 % vs septiembre"; without a previous figure there is nothing to compare.
 * A month that has not started is not compared: its "-100 %" would mean nothing.
 */
export function changeDetail(change: number | null, month: Month, previousMonth: Month, thisMonth: Month = currentMonth()): string {
  if (month > thisMonth) return 'Mes sin empezar'
  const name = monthNameLower(previousMonth)
  return change == null ? `Sin datos de ${name}` : `${formatChange(change)} vs ${name}`
}

export function availableStat(available: number): { tone: Tone; value: string; detail: string } {
  return { tone: available < 0 ? 'danger' : 'primary', value: formatMoney(available), detail: 'después de fijos pendientes' }
}

/**
 * `fixedCount` = fixed expenses that apply this month (paid or not); null while
 * the checklist of the month is not known (loading or failed). Unknown never
 * claims "Todo pagado" nor "Sin gastos fijos".
 */
export function fixedStat(pendingFixed: number, pendingCount: number, fixedCount: number | null): { tone: Tone; value: string; detail: string | undefined } {
  const value = formatMoney(pendingFixed)
  if (pendingFixed > 0 || pendingCount > 0) {
    return { tone: 'warning', value, detail: pendingCount === 1 ? '1 pago pendiente' : `${pendingCount} pagos pendientes` }
  }
  if (fixedCount == null) return { tone: 'neutral', value, detail: undefined }
  if (fixedCount > 0) return { tone: 'success', value, detail: 'Todo pagado' }
  return { tone: 'neutral', value, detail: 'Sin gastos fijos este mes' }
}

export function savingsStat(net: number, savingsRate: number | null): { tone: Tone; value: string; detail: string | undefined } {
  return {
    tone: net < 0 ? 'danger' : 'neutral',
    value: formatMoney(net),
    detail: savingsRate == null ? undefined : `${formatPercent(savingsRate)} de tus ingresos`,
  }
}

// ---------- upcoming fixed payments ----------
export function dueText(dueDate: IsoDate | null, today: IsoDate = todayIso()): { text: string; overdue: boolean } {
  if (dueDate == null) return { text: 'Sin fecha', overdue: false }
  const days = daysUntil(dueDate, today)
  if (days < 0) return { text: days === -1 ? 'Venció ayer' : `Venció hace ${-days} días`, overdue: true }
  if (days === 0) return { text: 'Vence hoy', overdue: false }
  return { text: `Vence ${dateShort(dueDate)}`, overdue: false }
}

export function expectedAmountText(item: Pick<FixedMonthItem, 'expectedAmount'> & { fixed: Pick<FixedMonthItem['fixed'], 'variableAmount'> }): string {
  if (item.expectedAmount === 0 && item.fixed.variableAmount) return 'Por definir'
  return formatMoney(item.expectedAmount)
}

// ---------- recent movements ----------
export function transactionTitle(tx: Pick<Transaction, 'description' | 'type'>, category: Category | undefined): string {
  if (tx.description.trim()) return tx.description
  if (tx.type === 'transfer') return 'Transferencia'
  return category?.name ?? 'Sin categoría'
}

/** Income "+$ 1.000" (green), expense "-$ 1.000" (ink), transfer "$ 1.000" (muted). */
export function signedAmount(tx: Pick<Transaction, 'amount' | 'type'>): { text: string; className: string } {
  if (tx.type === 'income') return { text: `+${formatMoney(tx.amount)}`, className: 'text-success' }
  if (tx.type === 'expense') return { text: formatMoney(-tx.amount), className: 'text-ink' }
  return { text: formatMoney(tx.amount), className: 'text-muted' }
}

// ---------- empty month ----------
/**
 * No income, no expenses and no fixed expenses: show the welcome instead of a board of zeros.
 * An unknown `fixedCount` (null) is never empty: the month may have every fixed expense paid.
 */
export function isEmptyMonth(summary: Pick<MonthSummary, 'income' | 'expenses' | 'pendingFixed' | 'upcomingFixed'>, fixedCount: number | null): boolean {
  return summary.income === 0 && summary.expenses === 0 && summary.pendingFixed === 0 && summary.upcomingFixed.length === 0 && fixedCount === 0
}

export interface WelcomeStep {
  key: 'fixed' | 'income' | 'expense'
  title: string
  text: string
  done: boolean
}

export function welcomeSteps(summary: Pick<MonthSummary, 'income' | 'expenses' | 'upcomingFixed'>, fixedCount: number): WelcomeStep[] {
  return [
    { key: 'fixed', title: 'Agrega tus gastos fijos', text: 'Arriendo, servicios, cuotas: lo que pagas todos los meses.', done: fixedCount > 0 || summary.upcomingFixed.length > 0 },
    { key: 'income', title: 'Registra tu ingreso del mes', text: 'Con eso sabrás cuánto te queda disponible para gastar.', done: summary.income > 0 },
    { key: 'expense', title: 'Registra un gasto', text: 'Cada gasto alimenta el ritmo del mes y tus categorías.', done: summary.expenses > 0 },
  ]
}

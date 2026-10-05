/**
 * Shared contract between the local API (server/) and the Vue app (src/).
 * Every request body and response shape lives here. Both sides import from
 * this file; do not redefine these types anywhere else.
 *
 * Money: integer Colombian pesos (no cents), always >= 0. The transaction
 * `type` decides the sign. Dates: 'YYYY-MM-DD'. Months: 'YYYY-MM'.
 */
import { z } from 'zod'

// ---------- primitives ----------
// Years 1900-2199 only: a typo such as 0000 or 0026 must not reach the month arithmetic.
export const monthSchema = z.string().regex(/^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/, 'Mes inválido (YYYY-MM)')
/** True when a well-formed 'YYYY-MM-DD' is a real calendar day (rejects 2026-02-31). Local time, no UTC. */
function isCalendarDate(value: string): boolean {
  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(5, 7))
  const day = Number(value.slice(8, 10))
  const date = new Date(2000, 0, 1)
  date.setFullYear(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

export const dateSchema = z
  .string()
  .regex(/^(19|20|21)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, { error: 'Fecha inválida (YYYY-MM-DD)', abort: true })
  .refine(isCalendarDate, 'Esa fecha no existe en el calendario')
export const moneySchema = z.number().int('El monto debe ser en pesos enteros').min(0).max(999_999_999_999)
export const idSchema = z.number().int().positive()

export type Month = string
export type IsoDate = string

/**
 * `?month=YYYY-MM` of GET /fixed, GET /budgets and GET /summary (reads only).
 * Optional: the server falls back to the current month (local time).
 */
export const monthQuerySchema = z.strictObject({ month: monthSchema.optional() })
export type MonthQuery = z.input<typeof monthQuerySchema>

/**
 * `?month=YYYY-MM` of DELETE /fixed/:id/pay. Required: a write never guesses the month,
 * because deleting the payments of the wrong month loses money records.
 */
export const requiredMonthQuerySchema = z.strictObject({
  month: z.string({ error: 'Falta el mes (YYYY-MM)' }).pipe(monthSchema),
})
export type RequiredMonthQuery = z.input<typeof requiredMonthQuerySchema>

// ---------- accounts ----------
export const ACCOUNT_TYPES = ['efectivo', 'ahorros', 'corriente', 'tarjeta', 'billetera'] as const
export type AccountType = (typeof ACCOUNT_TYPES)[number]
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  efectivo: 'Efectivo',
  ahorros: 'Cuenta de ahorros',
  corriente: 'Cuenta corriente',
  tarjeta: 'Tarjeta de crédito',
  billetera: 'Billetera digital',
}

export const accountInputSchema = z.strictObject({
  name: z.string().trim().min(1, 'Ponle un nombre').max(60),
  type: z.enum(ACCOUNT_TYPES),
  /** Can be negative (e.g. a credit card that already carries debt). */
  initialBalance: z.number().int().min(-999_999_999_999).max(999_999_999_999).default(0),
  archived: z.boolean().default(false),
})
export type AccountInput = z.input<typeof accountInputSchema>

/**
 * PATCH /api/accounts/:id. Every field optional and NO defaults: a field that is
 * not sent is not in the parsed result, so it can never overwrite a stored value.
 * Never validate a PATCH with `accountInputSchema.partial()`: it fills the defaults.
 */
export const accountPatchSchema = z.strictObject({
  name: accountInputSchema.shape.name.optional(),
  type: accountInputSchema.shape.type.optional(),
  initialBalance: accountInputSchema.shape.initialBalance.unwrap().optional(),
  archived: accountInputSchema.shape.archived.unwrap().optional(),
})
export type AccountPatch = z.input<typeof accountPatchSchema>

export interface Account {
  id: number
  name: string
  type: AccountType
  initialBalance: number
  archived: boolean
  /** initialBalance + income - expense +/- transfers, all time. Can be negative. */
  balance: number
}

// ---------- categories ----------
export const CATEGORY_KINDS = ['income', 'expense'] as const
export type CategoryKind = (typeof CATEGORY_KINDS)[number]

export const CATEGORY_GROUPS = ['ingresos', 'fijos', 'variables', 'ahorro'] as const
export type CategoryGroup = (typeof CATEGORY_GROUPS)[number]
export const CATEGORY_GROUP_LABELS: Record<CategoryGroup, string> = {
  ingresos: 'Ingresos',
  fijos: 'Gastos fijos',
  variables: 'Gastos variables',
  ahorro: 'Ahorro',
}

/** Palette keys; the hex values live in src/lib/palette.ts. */
export const CATEGORY_COLORS = ['blue', 'teal', 'green', 'lime', 'amber', 'orange', 'rose', 'pink', 'violet', 'indigo', 'cyan', 'slate'] as const
export type CategoryColor = (typeof CATEGORY_COLORS)[number]

/**
 * Rule between fields, validated by the server on the stored result (a PATCH may send
 * only one of the two) and answered as 422 with `fields`: kind 'income' goes with group
 * 'ingresos' and only with it; kind 'expense' goes with 'fijos', 'variables' or 'ahorro'.
 */
export const categoryInputSchema = z.strictObject({
  name: z.string().trim().min(1, 'Ponle un nombre').max(60),
  kind: z.enum(CATEGORY_KINDS),
  group: z.enum(CATEGORY_GROUPS),
  color: z.enum(CATEGORY_COLORS).default('slate'),
  archived: z.boolean().default(false),
})
export type CategoryInput = z.input<typeof categoryInputSchema>

/** PATCH /api/categories/:id. Every field optional and NO defaults (see accountPatchSchema). */
export const categoryPatchSchema = z.strictObject({
  name: categoryInputSchema.shape.name.optional(),
  kind: categoryInputSchema.shape.kind.optional(),
  group: categoryInputSchema.shape.group.optional(),
  color: categoryInputSchema.shape.color.unwrap().optional(),
  archived: categoryInputSchema.shape.archived.unwrap().optional(),
})
export type CategoryPatch = z.input<typeof categoryPatchSchema>

export interface Category {
  id: number
  name: string
  kind: CategoryKind
  group: CategoryGroup
  color: CategoryColor
  archived: boolean
}

// ---------- transactions ----------
export const TRANSACTION_TYPES = ['income', 'expense', 'transfer'] as const
export type TransactionType = (typeof TRANSACTION_TYPES)[number]

export const transactionInputSchema = z
  .strictObject({
    date: dateSchema,
    amount: moneySchema.min(1, 'El monto debe ser mayor a cero'),
    type: z.enum(TRANSACTION_TYPES),
    accountId: idSchema,
    /** Required for transfers, must be null otherwise. */
    toAccountId: idSchema.nullable().default(null),
    /** Required for income/expense, must be null for transfers. */
    categoryId: idSchema.nullable().default(null),
    description: z.string().trim().max(120).default(''),
    note: z.string().trim().max(500).default(''),
  })
  .superRefine((v, ctx) => {
    if (v.type === 'transfer') {
      if (v.toAccountId == null) ctx.addIssue({ code: 'custom', path: ['toAccountId'], message: 'Elige la cuenta destino' })
      if (v.toAccountId === v.accountId) ctx.addIssue({ code: 'custom', path: ['toAccountId'], message: 'La cuenta destino debe ser distinta' })
      if (v.categoryId != null) ctx.addIssue({ code: 'custom', path: ['categoryId'], message: 'Una transferencia no lleva categoría' })
    } else {
      if (v.categoryId == null) ctx.addIssue({ code: 'custom', path: ['categoryId'], message: 'Elige una categoría' })
      if (v.toAccountId != null) ctx.addIssue({ code: 'custom', path: ['toAccountId'], message: 'Solo las transferencias llevan cuenta destino' })
    }
  })
export type TransactionInput = z.input<typeof transactionInputSchema>

export interface Transaction {
  id: number
  date: IsoDate
  amount: number
  type: TransactionType
  accountId: number
  toAccountId: number | null
  categoryId: number | null
  description: string
  note: string
  /** Set when this movement is the payment of a fixed expense. */
  fixedExpenseId: number | null
  /** Month the fixed-expense payment applies to (may differ from the date's month). */
  fixedMonth: Month | null
  /** Set when the movement is a payment made straight to a debt from the Deudas screen. */
  debtId: number | null
  createdAt: string
}

/** GET /api/transactions query. `month` wins over from/to when both are sent. */
export const transactionQuerySchema = z.strictObject({
  month: monthSchema.optional(),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  type: z.enum(TRANSACTION_TYPES).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  accountId: z.coerce.number().int().positive().optional(),
  q: z.string().trim().max(120).optional(),
})
export type TransactionQuery = z.input<typeof transactionQuerySchema>

export const bulkCategorizeSchema = z.strictObject({
  ids: z.array(idSchema).min(1).max(500),
  categoryId: idSchema,
})
export type BulkCategorizeInput = z.input<typeof bulkCategorizeSchema>

/** Response of POST /api/transactions/bulk-categorize. */
export interface BulkCategorizeResult {
  /** How many movements changed category. */
  updated: number
}

// ---------- fixed expenses (the monthly checklist) ----------
/**
 * Rules between fields, validated by the server on the stored result (a PATCH may send
 * only one side) and answered as 422 with `fields`: endMonth, when set, is never before
 * startMonth; categoryId is an existing category of kind 'expense'; accountId exists.
 */
export const fixedExpenseInputSchema = z.strictObject({
  name: z.string().trim().min(1, 'Ponle un nombre').max(60),
  /** Expected monthly amount. 0 when it changes every month (e.g. a credit card). */
  amount: moneySchema,
  /** True when the amount is different every month; the UI asks for it each month. */
  variableAmount: z.boolean().default(false),
  /** Day of month it is due (1-31, clamped to the month's last day). Null = no due date. */
  dueDay: z.number().int().min(1).max(31).nullable().default(null),
  categoryId: idSchema,
  /** Default account used when marking it as paid. */
  accountId: idSchema.nullable().default(null),
  /** First month it applies to. */
  startMonth: monthSchema,
  /** Last month it applies to (inclusive). Null = still active. */
  endMonth: monthSchema.nullable().default(null),
  note: z.string().trim().max(500).default(''),
})
export type FixedExpenseInput = z.input<typeof fixedExpenseInputSchema>

/**
 * PATCH /api/fixed/:id. Every field optional and NO defaults (see accountPatchSchema).
 * Sending `null` in dueDay / accountId / endMonth clears it; leaving it out keeps it.
 */
export const fixedExpensePatchSchema = z.strictObject({
  name: fixedExpenseInputSchema.shape.name.optional(),
  amount: fixedExpenseInputSchema.shape.amount.optional(),
  variableAmount: fixedExpenseInputSchema.shape.variableAmount.unwrap().optional(),
  dueDay: fixedExpenseInputSchema.shape.dueDay.unwrap().optional(),
  categoryId: fixedExpenseInputSchema.shape.categoryId.optional(),
  accountId: fixedExpenseInputSchema.shape.accountId.unwrap().optional(),
  startMonth: fixedExpenseInputSchema.shape.startMonth.optional(),
  endMonth: fixedExpenseInputSchema.shape.endMonth.unwrap().optional(),
  note: fixedExpenseInputSchema.shape.note.unwrap().optional(),
})
export type FixedExpensePatch = z.input<typeof fixedExpensePatchSchema>

export interface FixedExpense {
  id: number
  name: string
  amount: number
  variableAmount: boolean
  dueDay: number | null
  categoryId: number
  accountId: number | null
  startMonth: Month
  endMonth: Month | null
  note: string
  /** Manual order in the checklist. */
  position: number
}

export const FIXED_STATUSES = ['paid', 'pending', 'overdue', 'skipped'] as const
export type FixedStatus = (typeof FIXED_STATUSES)[number]
export const FIXED_STATUS_LABELS: Record<FixedStatus, string> = {
  paid: 'Pagado',
  pending: 'Pendiente',
  overdue: 'Vencido',
  skipped: 'No aplica este mes',
}

/**
 * One row of the checklist for a given month. Status is derived, never stored.
 *
 * Status rule, checked in this order:
 * 1. 'skipped': the month is marked as "does not apply". A skipped month has no payments:
 *               the server guarantees it by answering 409 when a month that already has
 *               payments is marked as skipped, and paying a skipped month un-skips it.
 * 2. 'paid':    paidAmount > 0 AND paidAmount >= expectedAmount. A partial payment is NOT
 *               'paid'. With expectedAmount 0 (variable amount not set yet) any payment pays it.
 * 3. 'overdue': not paid and dueDate < today; without dueDate, not paid and month < current month.
 * 4. 'pending': everything else, including a partially paid item that is not overdue yet.
 *
 * Partial payment, expectedAmount 100.000 with one payment of 60.000 and not yet due:
 * status 'pending', paidAmount 60.000, remainingAmount 40.000. It adds 60.000 to totals.paid,
 * 40.000 to totals.pending, 100.000 to totals.expected and 40.000 to MonthSummary.pendingFixed.
 */
export interface FixedMonthItem {
  fixed: FixedExpense
  month: Month
  /** Month override if there is one, else fixed.amount. */
  expectedAmount: number
  /** True when this month has its own expected amount. */
  hasOverride: boolean
  /** Sum of the payments linked to this fixed expense for this month (partial payments included). */
  paidAmount: number
  /**
   * What is still left to pay this month: max(0, expectedAmount - paidAmount); 0 when
   * skipped or paid (an overpayment never makes it negative).
   */
  remainingAmount: number
  status: FixedStatus
  /** Null when the fixed expense has no dueDay. */
  dueDate: IsoDate | null
  /** Date of the last payment when status is 'paid', else null (also null while partially paid). */
  paidDate: IsoDate | null
  /** Every payment of this month, oldest first, whatever the status. */
  transactionIds: number[]
}

export interface FixedMonthResponse {
  month: Month
  items: FixedMonthItem[]
  /**
   * Skipped items are left out of every total. Identity that always holds:
   * expected = paid + pending.
   */
  totals: {
    /**
     * paid + pending. Equals the sum of expectedAmount, except that an overpaid item
     * counts what was actually paid.
     */
    expected: number
    /** Sum of paidAmount of every non-skipped item, partial payments included. */
    paid: number
    /** Sum of remainingAmount: what is still left to pay on pending + overdue items. */
    pending: number
    /** Items with status 'paid' (a partially paid item does not count). */
    countPaid: number
    /** Non-skipped items. */
    countTotal: number
  }
}

/** PUT /api/fixed/:id/months/:month */
export const fixedMonthOverrideSchema = z.strictObject({
  /** Null removes the override and goes back to fixed.amount. */
  expectedAmount: moneySchema.nullable().optional(),
  skipped: z.boolean().optional(),
})
export type FixedMonthOverrideInput = z.input<typeof fixedMonthOverrideSchema>

/** POST /api/fixed/:id/pay */
export const fixedPaySchema = z.strictObject({
  month: monthSchema,
  amount: moneySchema.min(1, 'El monto debe ser mayor a cero'),
  date: dateSchema,
  accountId: idSchema,
})
export type FixedPayInput = z.input<typeof fixedPaySchema>

/** PUT /api/fixed/order */
export const fixedOrderSchema = z.strictObject({ ids: z.array(idSchema).min(1) })
export type FixedOrderInput = z.input<typeof fixedOrderSchema>

// ---------- budgets ----------
/** PUT /api/budgets. A budget applies from `month` onward until a later one replaces it. */
export const budgetInputSchema = z.strictObject({
  categoryId: idSchema,
  month: monthSchema,
  /** Null removes the budget from this month onward. */
  amount: moneySchema.nullable(),
})
export type BudgetInput = z.input<typeof budgetInputSchema>

export const BUDGET_STATES = ['ok', 'warning', 'over', 'none'] as const
/** ok < 80 %, warning 80-100 %, over > 100 %, none = no budget set. */
export type BudgetState = (typeof BUDGET_STATES)[number]

export interface BudgetRow {
  category: Category
  /** Null when the category has no budget for the month. */
  budget: number | null
  /** Expenses of the category in the month. Transfers never count. */
  spent: number
  /** budget - spent; negative when over. Null without budget. */
  remaining: number | null
  /** spent / budget, as a fraction (0.5 = 50 %). Null without budget or budget 0. */
  ratio: number | null
  state: BudgetState
}

export interface BudgetMonthResponse {
  month: Month
  rows: BudgetRow[]
  /**
   * `spent` and `remaining` measure different things, so budget - spent is NOT remaining:
   * label them apart when both are shown.
   */
  totals: {
    /** Sum of the budgets of the categories that have one this month. */
    budget: number
    /** Every expense of the month, including categories without a budget. */
    spent: number
    /** budget minus what was spent in the budgeted categories only; negative when over. */
    remaining: number
  }
}

// ---------- summary (dashboard) ----------
export interface CategoryTotal {
  category: Category
  total: number
  count: number
  /** Share of the month's total for its kind, as a fraction (0.25 = 25 %). */
  share: number
}

export interface DailyPoint {
  date: IsoDate
  /** Expenses of that day. */
  spent: number
  /** Running total of expenses since day 1. Null for days after today (current month). */
  cumulative: number | null
}

export interface MonthSummary {
  month: Month
  /** Sum of the month's movements of type 'income'. Transfers never count. */
  income: number
  /** Sum of the month's movements of type 'expense'. Transfers never count. */
  expenses: number
  /** income - expenses. Can be negative. */
  net: number
  /** net / income as a fraction. Null when income is 0. */
  savingsRate: number | null
  /**
   * What is still left to pay of this month's fixed expenses: exactly
   * FixedMonthResponse.totals.pending for the same month (sum of remainingAmount of
   * pending + overdue items). A partial payment lowers it by what was paid.
   */
  pendingFixed: number
  /**
   * income - expenses - pendingFixed. Can be negative. Nothing is counted twice: a
   * payment (full or partial) is already inside `expenses`, and pendingFixed only
   * holds the part not paid yet.
   */
  availableToSpend: number
  previous: { month: Month; income: number; expenses: number; net: number }
  /** Change vs previous month as a fraction (0.1 = +10 %). Null when previous is 0. */
  change: { income: number | null; expenses: number | null }
  expensesByCategory: CategoryTotal[]
  incomeByCategory: CategoryTotal[]
  daily: DailyPoint[]
  /** Previous month's cumulative spending by day index, to draw the comparison line. */
  previousDailyCumulative: number[]
  /** Unpaid fixed expenses, soonest first. */
  upcomingFixed: FixedMonthItem[]
  recent: Transaction[]
  accounts: Account[]
  /** Sum of the balance of non-archived accounts. */
  totalBalance: number
}

// ---------- reports ----------
/** Totals of one month. Transfers count neither as income nor as expense. */
export interface MonthlyReportRow {
  month: Month
  income: number
  expenses: number
  /** income - expenses. Can be negative. */
  net: number
}

export interface CategoryReportRow {
  category: Category
  /** One total per month, same order as `months`. */
  totals: number[]
  total: number
  /** Monthly average in whole pesos: Math.round(total / months.length). Empty months count as 0. */
  average: number
}

export interface CategoryReport {
  months: Month[]
  rows: CategoryReportRow[]
}

export const MONTHLY_REPORT_DEFAULT_MONTHS = 12
export const MONTHLY_REPORT_MAX_MONTHS = 36

/** GET /api/reports/monthly query: the last `months` months up to `until` (default: current month). */
export const monthlyReportQuerySchema = z.strictObject({
  months: z.coerce.number().int().min(1).max(MONTHLY_REPORT_MAX_MONTHS).default(MONTHLY_REPORT_DEFAULT_MONTHS),
  until: monthSchema.optional(),
})
export type MonthlyReportQuery = z.input<typeof monthlyReportQuerySchema>

/**
 * GET /api/reports/categories query. Defaults: `to` = current month, `from` = 11 months
 * before `to`. The server also rejects (422) a `from` later than the defaulted `to`.
 */
export const categoryReportQuerySchema = z
  .strictObject({
    from: monthSchema.optional(),
    to: monthSchema.optional(),
    kind: z.enum(CATEGORY_KINDS).default('expense'),
  })
  .refine((query) => query.from == null || query.to == null || query.from <= query.to, {
    path: ['from'],
    message: 'El mes inicial no puede ser posterior al final',
  })
export type CategoryReportQuery = z.input<typeof categoryReportQuerySchema>

// ---------- debts (credit cards and loans) ----------
export const DEBT_KINDS = ['tarjeta', 'prestamo'] as const
export type DebtKind = (typeof DEBT_KINDS)[number]
export const DEBT_KIND_LABELS: Record<DebtKind, string> = {
  tarjeta: 'Tarjeta de crédito',
  prestamo: 'Préstamo',
}

/**
 * A debt starts at `initialBalance` on `startDate`. From then on its balance is
 *   initialBalance + charges (entries 'cargo') - manual payments (entries 'abono')
 *   - every payment of the linked fixed expense dated on or after startDate.
 * Linking the fixed expense (e.g. "BBVA 1") makes the monthly checklist payment
 * lower the debt by itself; charges (purchases, interest) are entered by hand.
 */
export const debtInputSchema = z.strictObject({
  name: z.string().trim().min(1, 'Ponle un nombre').max(60),
  kind: z.enum(DEBT_KINDS),
  /** What was owed on startDate. */
  initialBalance: moneySchema,
  startDate: dateSchema,
  /** Fixed expense whose payments lower this debt. Null = only manual entries. */
  fixedExpenseId: idSchema.nullable().default(null),
  note: z.string().trim().max(500).default(''),
  archived: z.boolean().default(false),
})
export type DebtInput = z.input<typeof debtInputSchema>

export const debtPatchSchema = z.strictObject({
  name: debtInputSchema.shape.name.optional(),
  kind: debtInputSchema.shape.kind.optional(),
  initialBalance: debtInputSchema.shape.initialBalance.optional(),
  startDate: debtInputSchema.shape.startDate.optional(),
  fixedExpenseId: idSchema.nullable().optional(),
  /** `.unwrap()` drops the input defaults: a PATCH without `note` must leave the saved note alone. */
  note: debtInputSchema.shape.note.unwrap().optional(),
  archived: debtInputSchema.shape.archived.unwrap().optional(),
})
export type DebtPatch = z.input<typeof debtPatchSchema>

export interface Debt {
  id: number
  name: string
  kind: DebtKind
  initialBalance: number
  startDate: IsoDate
  fixedExpenseId: number | null
  note: string
  archived: boolean
  /** What is owed right now. Can be negative when more was paid than owed. */
  balance: number
  /** Sum of every payment (manual + linked fixed expense) since startDate. */
  paidTotal: number
  /** Sum of every charge since startDate. */
  chargedTotal: number
  /** Payments dated in the current calendar month. */
  paidThisMonth: number
  lastPaymentDate: IsoDate | null
}

export const DEBT_ENTRY_TYPES = ['cargo', 'abono'] as const
export type DebtEntryType = (typeof DEBT_ENTRY_TYPES)[number]
export const DEBT_ENTRY_TYPE_LABELS: Record<DebtEntryType, string> = {
  cargo: 'Cargo (compra, interés, cuota de manejo)',
  abono: 'Abono registrado a mano',
}

/** A hand-entered charge or payment. Payments made through the fixed expense are NOT entries. */
export const debtEntryInputSchema = z.strictObject({
  date: dateSchema,
  type: z.enum(DEBT_ENTRY_TYPES),
  amount: moneySchema.min(1, 'El monto debe ser mayor a cero'),
  description: z.string().trim().max(120).default(''),
})
export type DebtEntryInput = z.input<typeof debtEntryInputSchema>

/** POST /debts/:id/pay: money that leaves an account and lowers the debt in one go. */
export const debtPaySchema = z.strictObject({
  date: dateSchema,
  amount: moneySchema.min(1, 'El monto debe ser mayor a cero'),
  accountId: idSchema,
  description: z.string().trim().max(120).default(''),
})
export type DebtPayInput = z.input<typeof debtPaySchema>

export interface DebtEntry {
  id: number
  debtId: number
  date: IsoDate
  type: DebtEntryType
  amount: number
  description: string
}

/** One line of a debt's history: a manual entry or a linked fixed-expense payment. */
export interface DebtMovement {
  date: IsoDate
  type: DebtEntryType
  amount: number
  description: string
  /**
   * 'entry' = hand-entered (deletable here); 'payment' = a movement of the linked fixed
   * expense; 'account' = paid straight to the debt from an account (POST /debts/:id/pay),
   * deletable through DELETE /transactions/:id.
   */
  source: 'entry' | 'payment' | 'account'
  entryId: number | null
  transactionId: number | null
  /** Account the money left from, for 'payment' and 'account' lines. */
  accountId: number | null
  /** Balance after this line, in chronological order. */
  balanceAfter: number
}

export interface DebtMonthRow {
  month: Month
  paid: number
  charged: number
  /** Balance at the end of the month. */
  balanceEnd: number
}

export interface DebtDetail {
  debt: Debt
  /** Newest first. */
  movements: DebtMovement[]
  /** From the start month to the current month, oldest first. */
  monthly: DebtMonthRow[]
}

export interface DebtsResponse {
  /** Active debts first, then archived. */
  debts: Debt[]
  /** Sum of the balance of non-archived debts. */
  totalDebt: number
  /** Sum of paidThisMonth of non-archived debts. */
  paidThisMonth: number
}

// ---------- backup ----------
export interface BackupFile {
  app: 'app-financiera'
  version: 1
  exportedAt: string
  accounts: unknown[]
  categories: unknown[]
  transactions: unknown[]
  fixedExpenses: unknown[]
  fixedMonths: unknown[]
  budgets: unknown[]
  /** Added with the debts feature; a backup from before has neither. */
  debts?: unknown[]
  debtEntries?: unknown[]
}

/** One table of a backup: flat rows of column -> value. */
const backupRowsSchema = z.array(z.record(z.string(), z.union([z.string(), z.number(), z.null()])))

/**
 * POST /api/backup/restore body: a BackupFile as downloaded from GET /api/backup.
 * The server also checks every row against the real columns and restores atomically:
 * an invalid file is answered with 422 and changes nothing.
 */
export const backupRestoreSchema = z.object({
  app: z.literal('app-financiera', 'Este archivo no es un respaldo de esta app'),
  version: z.literal(1, 'Versión de respaldo no soportada'),
  exportedAt: z.string().optional(),
  accounts: backupRowsSchema,
  categories: backupRowsSchema,
  transactions: backupRowsSchema,
  fixedExpenses: backupRowsSchema,
  fixedMonths: backupRowsSchema,
  budgets: backupRowsSchema,
  debts: backupRowsSchema.default([]),
  debtEntries: backupRowsSchema.default([]),
})
export type BackupRestoreInput = z.input<typeof backupRestoreSchema>

/** Response of POST /api/backup/restore. */
export interface BackupRestoreResult {
  restored: true
}

// ---------- errors ----------
/** Every non-2xx response has this body. */
export interface ApiError {
  error: string
  /** Field path -> message, present on 422 validation errors. */
  fields?: Record<string, string>
}

/**
 * Routes (all under /api, JSON). Each line: schema of the body or query -> success status and response.
 *
 * Success: 200 with a body, 201 when a POST creates a record, 204 without body.
 * Errors (body = ApiError): 404 when the `:id` does not exist or is not a positive integer
 * (idSchema); 409 where noted; 422 when the body, the query or a `:month` (monthSchema)
 * fails validation, or when a referenced id does not exist.
 *
 * GET    /accounts                      -> 200 Account[]
 * POST   /accounts                      accountInputSchema -> 201 Account
 * PATCH  /accounts/:id                  accountPatchSchema -> 200 Account
 * DELETE /accounts/:id                  -> 204 (409 if it has movements: archive it instead)
 *
 * GET    /categories                    -> 200 Category[]
 * POST   /categories                    categoryInputSchema -> 201 Category
 * PATCH  /categories/:id                categoryPatchSchema -> 200 Category
 * DELETE /categories/:id                -> 204 (409 if in use: archive it instead)
 *
 * GET    /transactions                  query transactionQuerySchema -> 200 Transaction[] (date desc, id desc)
 * POST   /transactions                  transactionInputSchema -> 201 Transaction
 * PATCH  /transactions/:id              transactionInputSchema (full object) -> 200 Transaction
 * DELETE /transactions/:id              -> 204
 * POST   /transactions/bulk-categorize  bulkCategorizeSchema -> 200 BulkCategorizeResult
 *
 * GET    /fixed                         query monthQuerySchema -> 200 FixedMonthResponse
 * POST   /fixed                         fixedExpenseInputSchema -> 201 FixedExpense
 * PATCH  /fixed/:id                     fixedExpensePatchSchema -> 200 FixedExpense
 * DELETE /fixed/:id                     -> 204 (its payments stay as normal movements; 409 if a debt is linked to it: unlink or delete the debt first)
 * PUT    /fixed/order                   fixedOrderSchema -> 204
 * PUT    /fixed/:id/months/:month       fixedMonthOverrideSchema -> 200 FixedMonthItem (409 if skipped: true and the month already has payments)
 * POST   /fixed/:id/pay                 fixedPaySchema -> 201 FixedMonthItem
 * DELETE /fixed/:id/pay                 query requiredMonthQuerySchema -> 200 FixedMonthItem (deletes that month's payments)
 *
 * GET    /budgets                       query monthQuerySchema -> 200 BudgetMonthResponse
 * PUT    /budgets                       budgetInputSchema -> 200 BudgetMonthResponse
 *
 * GET    /summary                       query monthQuerySchema -> 200 MonthSummary
 * GET    /reports/monthly               query monthlyReportQuerySchema -> 200 MonthlyReportRow[] (oldest first)
 * GET    /reports/categories            query categoryReportQuerySchema -> 200 CategoryReport
 *
 * GET    /debts                         -> 200 DebtsResponse
 * POST   /debts                         debtInputSchema -> 201 Debt (422 if fixedExpenseId does not exist or is already linked to another debt)
 * GET    /debts/:id                     -> 200 DebtDetail
 * PATCH  /debts/:id                     debtPatchSchema (only the sent fields change) -> 200 Debt (422 if startDate is later than an existing entry, or fixedExpenseId is invalid/already linked)
 * DELETE /debts/:id                     -> 204 (deletes its entries; the fixed expense and its payments stay)
 * POST   /debts/:id/pay                 debtPaySchema -> 201 DebtDetail (creates an expense movement linked to the debt; 422 if the date is before startDate)
 * POST   /debts/:id/entries             debtEntryInputSchema -> 201 DebtDetail
 * DELETE /debts/:id/entries/:entryId    -> 200 DebtDetail
 *
 * GET    /backup                        -> 200 BackupFile (download)
 * POST   /backup/restore                backupRestoreSchema -> 200 BackupRestoreResult (replaces everything)
 */

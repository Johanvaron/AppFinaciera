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
export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mes inválido (YYYY-MM)')
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
  .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, { error: 'Fecha inválida (YYYY-MM-DD)', abort: true })
  .refine(isCalendarDate, 'Esa fecha no existe en el calendario')
export const moneySchema = z.number().int('El monto debe ser en pesos enteros').min(0).max(999_999_999_999)
export const idSchema = z.number().int().positive()

export type Month = string
export type IsoDate = string

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

// ---------- fixed expenses (the monthly checklist) ----------
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
 * 1. 'skipped': the month is marked as "does not apply". A skipped month has no payments.
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
  totals: { budget: number; spent: number; remaining: number }
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
  income: number
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
export interface MonthlyReportRow {
  month: Month
  income: number
  expenses: number
  net: number
}

export interface CategoryReportRow {
  category: Category
  /** One total per month, same order as `months`. */
  totals: number[]
  total: number
  average: number
}

export interface CategoryReport {
  months: Month[]
  rows: CategoryReportRow[]
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
}

// ---------- errors ----------
/** Every non-2xx response has this body. */
export interface ApiError {
  error: string
  /** Field path -> message, present on 422 validation errors. */
  fields?: Record<string, string>
}

/**
 * Routes (all under /api, JSON):
 *
 * GET    /accounts                         -> Account[]
 * POST   /accounts                         AccountInput -> Account
 * PATCH  /accounts/:id                     AccountPatch -> Account
 * DELETE /accounts/:id                     -> 204 (409 if it has movements: archive it instead)
 *
 * GET    /categories                       -> Category[]
 * POST   /categories                       CategoryInput -> Category
 * PATCH  /categories/:id                   CategoryPatch -> Category
 * DELETE /categories/:id                   -> 204 (409 if in use: archive it instead)
 *
 * GET    /transactions?TransactionQuery    -> Transaction[] (date desc, id desc)
 * POST   /transactions                     TransactionInput -> Transaction
 * PATCH  /transactions/:id                 TransactionInput (full object) -> Transaction
 * DELETE /transactions/:id                 -> 204
 * POST   /transactions/bulk-categorize     BulkCategorizeInput -> { updated: number }
 *
 * GET    /fixed?month=YYYY-MM              -> FixedMonthResponse
 * POST   /fixed                            FixedExpenseInput -> FixedExpense
 * PATCH  /fixed/:id                        FixedExpensePatch -> FixedExpense
 * DELETE /fixed/:id                        -> 204 (its payments stay as normal movements)
 * PUT    /fixed/order                      { ids } -> 204
 * PUT    /fixed/:id/months/:month          FixedMonthOverrideInput -> FixedMonthItem
 * POST   /fixed/:id/pay                    FixedPayInput -> FixedMonthItem
 * DELETE /fixed/:id/pay?month=YYYY-MM      -> FixedMonthItem (deletes that month's payments)
 *
 * GET    /budgets?month=YYYY-MM            -> BudgetMonthResponse
 * PUT    /budgets                          BudgetInput -> BudgetMonthResponse
 *
 * GET    /summary?month=YYYY-MM            -> MonthSummary
 * GET    /reports/monthly?months=12&until=YYYY-MM   -> MonthlyReportRow[] (oldest first)
 * GET    /reports/categories?from=YYYY-MM&to=YYYY-MM&kind=expense -> CategoryReport
 *
 * GET    /backup                           -> BackupFile (download)
 * POST   /backup/restore                   BackupFile -> { restored: true } (replaces everything)
 */

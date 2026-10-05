/**
 * The ONLY place that talks HTTP to the local API. Views never call fetch:
 * they use the hooks in ./queries.ts, which wrap these functions.
 */
import type {
  Account,
  AccountInput,
  ApiError,
  BackupFile,
  BudgetInput,
  BudgetMonthResponse,
  BulkCategorizeInput,
  Category,
  CategoryInput,
  CategoryKind,
  CategoryReport,
  Debt,
  DebtDetail,
  DebtEntryInput,
  DebtInput,
  DebtPatch,
  DebtsResponse,
  FixedExpense,
  FixedExpenseInput,
  FixedMonthItem,
  FixedMonthOverrideInput,
  FixedMonthResponse,
  FixedPayInput,
  IsoDate,
  Month,
  MonthlyReportRow,
  MonthSummary,
  Transaction,
  TransactionInput,
  TransactionType,
} from '@shared/contract'

export class ApiRequestError extends Error {
  readonly status: number
  readonly fields: Record<string, string>

  constructor(status: number, message: string, fields: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.fields = fields
  }
}

/** Filters of GET /transactions as the app sends them (the contract's query schema coerces strings). */
export interface TransactionFilters {
  month?: Month
  from?: IsoDate
  to?: IsoDate
  type?: TransactionType
  categoryId?: number
  accountId?: number
  q?: string
}

const OFFLINE_MESSAGE = 'No se pudo conectar con el servidor local. ¿Está corriendo "pnpm dev"?'
const UNREADABLE_MESSAGE = 'El servidor respondió algo que no se pudo leer. Intenta de nuevo.'
const NOT_JSON = Symbol('not json')

type Query = Record<string, string | number | undefined | null>

function toQueryString(query?: Query): string {
  if (!query) return ''
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  const text = params.toString()
  return text ? `?${text}` : ''
}

async function request<T>(method: string, path: string, options: { body?: unknown; query?: Query } = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api${path}${toQueryString(options.query)}`, {
      method,
      headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch {
    throw new ApiRequestError(0, OFFLINE_MESSAGE)
  }
  if (response.status === 204) return undefined as T
  // A body that is not JSON is not thrown here: what it means depends on the status, decided right below.
  const data: unknown = await response.json().catch(() => NOT_JSON)
  if (data === NOT_JSON) {
    // The API always answers JSON. A 5xx without it comes from the dev proxy: the API is down.
    if (response.status >= 500) throw new ApiRequestError(0, OFFLINE_MESSAGE)
    // A 2xx without it would reach the views as empty data: better an error than a blank or wrong figure.
    throw new ApiRequestError(response.status, response.ok ? UNREADABLE_MESSAGE : `Error ${response.status}`)
  }
  if (!response.ok) {
    const error = data as ApiError | null
    throw new ApiRequestError(response.status, error?.error ?? `Error ${response.status}`, error?.fields)
  }
  return data as T
}

export const api = {
  accounts: {
    list: () => request<Account[]>('GET', '/accounts'),
    create: (body: AccountInput) => request<Account>('POST', '/accounts', { body }),
    update: (id: number, body: Partial<AccountInput>) => request<Account>('PATCH', `/accounts/${id}`, { body }),
    remove: (id: number) => request<void>('DELETE', `/accounts/${id}`),
  },
  categories: {
    list: () => request<Category[]>('GET', '/categories'),
    create: (body: CategoryInput) => request<Category>('POST', '/categories', { body }),
    update: (id: number, body: Partial<CategoryInput>) => request<Category>('PATCH', `/categories/${id}`, { body }),
    remove: (id: number) => request<void>('DELETE', `/categories/${id}`),
  },
  transactions: {
    list: (query: TransactionFilters) => request<Transaction[]>('GET', '/transactions', { query: { ...query } }),
    create: (body: TransactionInput) => request<Transaction>('POST', '/transactions', { body }),
    update: (id: number, body: TransactionInput) => request<Transaction>('PATCH', `/transactions/${id}`, { body }),
    remove: (id: number) => request<void>('DELETE', `/transactions/${id}`),
    bulkCategorize: (body: BulkCategorizeInput) => request<{ updated: number }>('POST', '/transactions/bulk-categorize', { body }),
  },
  fixed: {
    month: (month: Month) => request<FixedMonthResponse>('GET', '/fixed', { query: { month } }),
    create: (body: FixedExpenseInput) => request<FixedExpense>('POST', '/fixed', { body }),
    update: (id: number, body: Partial<FixedExpenseInput>) => request<FixedExpense>('PATCH', `/fixed/${id}`, { body }),
    remove: (id: number) => request<void>('DELETE', `/fixed/${id}`),
    reorder: (ids: number[]) => request<void>('PUT', '/fixed/order', { body: { ids } }),
    override: (id: number, month: Month, body: FixedMonthOverrideInput) => request<FixedMonthItem>('PUT', `/fixed/${id}/months/${month}`, { body }),
    pay: (id: number, body: FixedPayInput) => request<FixedMonthItem>('POST', `/fixed/${id}/pay`, { body }),
    unpay: (id: number, month: Month) => request<FixedMonthItem>('DELETE', `/fixed/${id}/pay`, { query: { month } }),
  },
  budgets: {
    month: (month: Month) => request<BudgetMonthResponse>('GET', '/budgets', { query: { month } }),
    set: (body: BudgetInput) => request<BudgetMonthResponse>('PUT', '/budgets', { body }),
  },
  debts: {
    list: () => request<DebtsResponse>('GET', '/debts'),
    detail: (id: number) => request<DebtDetail>('GET', `/debts/${id}`),
    create: (body: DebtInput) => request<Debt>('POST', '/debts', { body }),
    update: (id: number, body: DebtPatch) => request<Debt>('PATCH', `/debts/${id}`, { body }),
    remove: (id: number) => request<void>('DELETE', `/debts/${id}`),
    addEntry: (id: number, body: DebtEntryInput) => request<DebtDetail>('POST', `/debts/${id}/entries`, { body }),
    removeEntry: (id: number, entryId: number) => request<DebtDetail>('DELETE', `/debts/${id}/entries/${entryId}`),
  },
  summary: (month: Month) => request<MonthSummary>('GET', '/summary', { query: { month } }),
  reports: {
    monthly: (query: { months?: number; until?: Month }) => request<MonthlyReportRow[]>('GET', '/reports/monthly', { query }),
    categories: (query: { from: Month; to: Month; kind?: CategoryKind }) => request<CategoryReport>('GET', '/reports/categories', { query }),
  },
  backup: {
    /** Plain link: the browser downloads the file. */
    downloadUrl: '/api/backup',
    restore: (body: BackupFile) => request<{ restored: true }>('POST', '/backup/restore', { body }),
  },
}

/** Test harness: the real app over an in-memory database, with a pinned "today". */
import { createApp } from '../app.ts'
import { openDatabase } from '../db.ts'

export interface ApiResponse<T = any> {
  status: number
  body: T
  headers: Headers
}

export function createTestApi(today = '2026-03-15') {
  const clock = { today }
  const db = openDatabase(':memory:')
  const app = createApp(db, { clock: () => clock.today })

  async function call<T = any>(method: string, path: string, body?: unknown): Promise<ApiResponse<T>> {
    const init: RequestInit = { method }
    if (body !== undefined) {
      init.headers = { 'Content-Type': 'application/json' }
      init.body = JSON.stringify(body)
    }
    const response = await app.request(`/api${path}`, init)
    const text = await response.text()
    return { status: response.status, body: text ? JSON.parse(text) : null, headers: response.headers }
  }

  /** Calls and returns the body, failing loudly when the status is not the expected one. */
  async function ok<T = any>(method: string, path: string, body?: unknown, status = 200): Promise<T> {
    const response = await call<T>(method, path, body)
    if (response.status !== status) {
      throw new Error(`${method} ${path} -> ${response.status} ${JSON.stringify(response.body)}`)
    }
    return response.body
  }

  const account = (name: string, initialBalance = 0, type = 'ahorros'): Promise<number> =>
    ok('POST', '/accounts', { name, type, initialBalance }, 201).then((row) => row.id)

  const category = (name: string, kind: 'income' | 'expense', group = kind === 'income' ? 'ingresos' : 'variables') =>
    ok('POST', '/categories', { name, kind, group }, 201).then((row) => row.id as number)

  const income = (date: string, amount: number, accountId: number, categoryId: number, description = '') =>
    ok('POST', '/transactions', { date, amount, type: 'income', accountId, categoryId, description }, 201)

  const expense = (date: string, amount: number, accountId: number, categoryId: number, description = '') =>
    ok('POST', '/transactions', { date, amount, type: 'expense', accountId, categoryId, description }, 201)

  const transfer = (date: string, amount: number, accountId: number, toAccountId: number) =>
    ok('POST', '/transactions', { date, amount, type: 'transfer', accountId, toAccountId }, 201)

  const fixed = (input: Record<string, unknown>): Promise<number> =>
    ok('POST', '/fixed', { startMonth: '2026-01', ...input }, 201).then((row) => row.id)

  return { db, clock, call, ok, account, category, income, expense, transfer, fixed }
}

export type TestApi = ReturnType<typeof createTestApi>

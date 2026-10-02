import {
  accountInputSchema,
  accountPatchSchema,
  backupRestoreSchema,
  categoryPatchSchema,
  categoryReportQuerySchema,
  dateSchema,
  fixedExpensePatchSchema,
  fixedPaySchema,
  monthQuerySchema,
  monthlyReportQuerySchema,
} from './contract.ts'

describe('query schemas', () => {
  it('month query: optional month, nothing else', () => {
    expect(monthQuerySchema.parse({})).toEqual({})
    expect(monthQuerySchema.parse({ month: '2026-02' })).toEqual({ month: '2026-02' })
    expect(monthQuerySchema.safeParse({ month: '2026-13' }).success).toBe(false)
    expect(monthQuerySchema.safeParse({ mes: '2026-02' }).success).toBe(false)
  })

  it('monthly report: months arrives as text, defaults to 12 and stops at 36', () => {
    expect(monthlyReportQuerySchema.parse({})).toEqual({ months: 12 })
    expect(monthlyReportQuerySchema.parse({ months: '6', until: '2026-01' })).toEqual({ months: 6, until: '2026-01' })
    expect(monthlyReportQuerySchema.safeParse({ months: '37' }).success).toBe(false)
    expect(monthlyReportQuerySchema.safeParse({ months: '0' }).success).toBe(false)
  })

  it('category report: defaults to expenses and rejects from after to', () => {
    expect(categoryReportQuerySchema.parse({})).toEqual({ kind: 'expense' })
    expect(categoryReportQuerySchema.parse({ from: '2025-11', to: '2026-02', kind: 'income' })).toEqual({
      from: '2025-11',
      to: '2026-02',
      kind: 'income',
    })
    const result = categoryReportQuerySchema.safeParse({ from: '2026-03', to: '2026-02' })
    expect(result.success ? [] : result.error.issues.map((issue) => [issue.path.join('.'), issue.message])).toEqual([
      ['from', 'El mes inicial no puede ser posterior al final'],
    ])
  })
})

describe('backupRestoreSchema', () => {
  const backup = {
    app: 'app-financiera',
    version: 1,
    exportedAt: '2026-02-10T15:00:00.000Z',
    accounts: [{ id: 1, name: 'Nequi', initial_balance: 250_000, archived: 0 }],
    categories: [],
    transactions: [{ id: 7, amount: 60_000, to_account_id: null }],
    fixedExpenses: [],
    fixedMonths: [],
    budgets: [],
  }
  const messages = (data: unknown): string[] => {
    const result = backupRestoreSchema.safeParse(data)
    return result.success ? [] : result.error.issues.map((issue) => issue.message)
  }

  it('accepts a downloaded backup without changing its rows', () => {
    expect(backupRestoreSchema.parse(backup)).toEqual(backup)
  })

  it('rejects a file from another app or version with a clear message', () => {
    expect(messages({ ...backup, app: 'otra-app' })).toEqual(['Este archivo no es un respaldo de esta app'])
    expect(messages({ ...backup, version: 2 })).toEqual(['Versión de respaldo no soportada'])
  })

  it('rejects a missing table and rows that are not flat', () => {
    const { budgets: _budgets, ...withoutBudgets } = backup
    expect(backupRestoreSchema.safeParse(withoutBudgets).success).toBe(false)
    expect(backupRestoreSchema.safeParse({ ...backup, accounts: [{ id: 1, extra: { nested: true } }] }).success).toBe(false)
  })
})

describe('dateSchema', () => {
  const messages = (value: string): string[] => {
    const result = dateSchema.safeParse(value)
    return result.success ? [] : result.error.issues.map((issue) => issue.message)
  }

  it.each(['2026-02-31', '2026-04-31', '2025-02-29', '2026-02-30'])('rejects %s: the day does not exist', (value) => {
    expect(messages(value)).toEqual(['Esa fecha no existe en el calendario'])
  })

  it.each(['2024-02-29', '2026-01-31', '2026-12-31', '2026-02-28'])('accepts %s', (value) => {
    expect(messages(value)).toEqual([])
  })

  it('reports a malformed date once, with the format message', () => {
    expect(messages('31/01/2026')).toEqual(['Fecha inválida (YYYY-MM-DD)'])
    expect(messages('2026-13-01')).toEqual(['Fecha inválida (YYYY-MM-DD)'])
  })

  it('rejects a fixed-expense payment dated on a day that does not exist', () => {
    const result = fixedPaySchema.safeParse({ month: '2026-02', amount: 60_000, date: '2026-02-31', accountId: 1 })
    expect(result.success).toBe(false)
  })
})

describe('PATCH schemas', () => {
  it('returns only the fields that were sent, without filling defaults', () => {
    expect(accountPatchSchema.parse({ name: 'Nequi' })).toEqual({ name: 'Nequi' })
    expect(categoryPatchSchema.parse({ name: 'Mercado' })).toEqual({ name: 'Mercado' })
    expect(fixedExpensePatchSchema.parse({ amount: 85_000 })).toEqual({ amount: 85_000 })
    expect(accountPatchSchema.parse({})).toEqual({})
  })

  it('keeps an explicit null so a fixed expense field can be cleared', () => {
    expect(fixedExpensePatchSchema.parse({ dueDay: null, endMonth: null })).toEqual({ dueDay: null, endMonth: null })
  })

  it('keeps the rules of the input schema', () => {
    expect(accountPatchSchema.safeParse({ name: '  ' }).success).toBe(false)
    expect(accountPatchSchema.safeParse({ initialBalance: 1500.5 }).success).toBe(false)
    expect(fixedExpensePatchSchema.safeParse({ amount: -1 }).success).toBe(false)
    expect(categoryPatchSchema.safeParse({ color: 'neon' }).success).toBe(false)
    expect(accountPatchSchema.safeParse({ balance: 10 }).success).toBe(false)
  })

  it('leaves the create schema defaults untouched', () => {
    expect(accountInputSchema.parse({ name: 'Nequi', type: 'billetera' })).toEqual({
      name: 'Nequi',
      type: 'billetera',
      initialBalance: 0,
      archived: false,
    })
  })
})

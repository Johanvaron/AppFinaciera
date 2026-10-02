import {
  accountInputSchema,
  accountPatchSchema,
  categoryPatchSchema,
  dateSchema,
  fixedExpensePatchSchema,
  fixedPaySchema,
} from './contract.ts'

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

import { accountInputSchema, accountPatchSchema, categoryPatchSchema, fixedExpensePatchSchema } from './contract.ts'

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

import { beforeEach, describe, expect, it } from 'vitest'
import { createTestApi, type TestApi } from './helpers.ts'

describe('debts: credit cards and loans', () => {
  let api: TestApi
  let bank: number
  let cards: number
  let bbva: number

  beforeEach(async () => {
    api = createTestApi('2026-10-05')
    bank = await api.account('Nu', 3_000_000)
    cards = await api.category('Deudas y tarjetas', 'expense', 'fijos')
    bbva = await api.fixed({ name: 'BBVA 1', amount: 0, variableAmount: true, categoryId: cards, startMonth: '2026-08' })
  })

  const debt = (input: Record<string, unknown>) =>
    api.ok('POST', '/debts', { kind: 'tarjeta', startDate: '2026-09-01', ...input }, 201)

  const pay = (fixedId: number, month: string, amount: number, date: string) =>
    api.ok('POST', `/fixed/${fixedId}/pay`, { month, amount, date, accountId: bank }, 201)

  it('starts at the initial balance and goes down with the linked fixed-expense payments', async () => {
    const card = await debt({ name: 'BBVA 1', initialBalance: 2_500_000, fixedExpenseId: bbva })
    expect(card).toMatchObject({ balance: 2_500_000, paidTotal: 0, paidThisMonth: 0, lastPaymentDate: null })

    await pay(bbva, '2026-09', 333_100, '2026-09-10')
    await pay(bbva, '2026-10', 368_473, '2026-10-03')
    const after = await api.ok('GET', `/debts/${card.id}`)
    expect(after.debt).toMatchObject({
      balance: 2_500_000 - 333_100 - 368_473,
      paidTotal: 701_573,
      paidThisMonth: 368_473,
      lastPaymentDate: '2026-10-03',
    })
    expect(after.movements.map((m: any) => [m.date, m.type, m.amount, m.source, m.balanceAfter])).toEqual([
      ['2026-10-03', 'abono', 368_473, 'payment', 1_798_427],
      ['2026-09-10', 'abono', 333_100, 'payment', 2_166_900],
    ])
    expect(after.monthly).toEqual([
      { month: '2026-09', paid: 333_100, charged: 0, balanceEnd: 2_166_900 },
      { month: '2026-10', paid: 368_473, charged: 0, balanceEnd: 1_798_427 },
    ])
  })

  it('ignores payments dated before the start date (they were already inside the initial balance)', async () => {
    await pay(bbva, '2026-08', 500_000, '2026-08-20')
    const card = await debt({ name: 'BBVA 1', initialBalance: 1_000_000, fixedExpenseId: bbva, startDate: '2026-09-01' })
    expect(card.balance).toBe(1_000_000)
  })

  it('goes up with charges and down with manual payments, in date order', async () => {
    const card = await debt({ name: 'Rappi', initialBalance: 1_143_416 })
    let detail = await api.ok('POST', `/debts/${card.id}/entries`, { date: '2026-10-02', type: 'cargo', amount: 120_000, description: 'Mercado' }, 201)
    detail = await api.ok('POST', `/debts/${card.id}/entries`, { date: '2026-10-01', type: 'abono', amount: 517_943, description: 'Pago desde Nu' }, 201)
    expect(detail.debt.balance).toBe(1_143_416 - 517_943 + 120_000)
    expect(detail.movements.map((m: any) => [m.date, m.type, m.balanceAfter])).toEqual([
      ['2026-10-02', 'cargo', 745_473],
      ['2026-10-01', 'abono', 625_473],
    ])
    expect((await api.ok('GET', '/debts')).debts[0]).toMatchObject({ chargedTotal: 120_000, paidTotal: 517_943 })

    const entryId = detail.movements[0].entryId
    const removed = await api.ok('DELETE', `/debts/${card.id}/entries/${entryId}`)
    expect(removed.debt.balance).toBe(625_473)
  })

  it('sums only active debts in the totals', async () => {
    await debt({ name: 'Moto', kind: 'prestamo', initialBalance: 9_600_000 })
    const old = await debt({ name: 'Vieja', initialBalance: 50_000 })
    await api.ok('PATCH', `/debts/${old.id}`, { archived: true })
    const list = await api.ok('GET', '/debts')
    expect(list.totalDebt).toBe(9_600_000)
    expect(list.debts.map((d: any) => [d.name, d.archived])).toEqual([
      ['Moto', false],
      ['Vieja', true],
    ])
  })

  it('refuses a fixed expense that is already linked to another debt, or that does not exist', async () => {
    await debt({ name: 'BBVA 1', initialBalance: 10, fixedExpenseId: bbva })
    const dup = await api.call('POST', '/debts', { name: 'Otra', kind: 'tarjeta', initialBalance: 10, startDate: '2026-09-01', fixedExpenseId: bbva })
    expect(dup.status).toBe(422)
    expect(dup.body.fields.fixedExpenseId).toContain('BBVA 1')
    const missing = await api.call('POST', '/debts', { name: 'Otra', kind: 'tarjeta', initialBalance: 10, startDate: '2026-09-01', fixedExpenseId: 999 })
    expect(missing.status).toBe(422)
  })

  it('rejects an entry dated before the debt started and impossible dates', async () => {
    const card = await debt({ name: 'Rappi', initialBalance: 100 })
    const early = await api.call('POST', `/debts/${card.id}/entries`, { date: '2026-08-31', type: 'cargo', amount: 1 })
    expect(early.status).toBe(422)
    expect(early.body.fields.date).toBe('La fecha es anterior al inicio de la deuda')
    const fake = await api.call('POST', `/debts/${card.id}/entries`, { date: '2026-11-31', type: 'cargo', amount: 1 })
    expect(fake.status).toBe(422)
  })

  it('keeps the saved note when a PATCH does not mention it, and empties it only when asked', async () => {
    const card = await debt({ name: 'BBVA 1', initialBalance: 2_500_000, note: 'Cuota 12 de 24' })
    const archived = await api.ok('PATCH', `/debts/${card.id}`, { archived: true })
    expect(archived).toMatchObject({ note: 'Cuota 12 de 24', archived: true })
    const detail = await api.ok('GET', `/debts/${card.id}`)
    expect(detail.debt).toMatchObject({ note: 'Cuota 12 de 24', archived: true })

    const renamed = await api.ok('PATCH', `/debts/${card.id}`, { name: 'BBVA Visa' })
    expect(renamed).toMatchObject({ name: 'BBVA Visa', note: 'Cuota 12 de 24', archived: true })

    const cleared = await api.ok('PATCH', `/debts/${card.id}`, { note: '' })
    expect(cleared.note).toBe('')
    expect((await api.ok('GET', `/debts/${card.id}`)).debt.note).toBe('')
  })

  it('refuses to move the start date past an existing entry, so balance and monthly keep agreeing', async () => {
    const card = await debt({ name: 'Rappi', initialBalance: 1_000_000 })
    await api.ok('POST', `/debts/${card.id}/entries`, { date: '2026-09-05', type: 'cargo', amount: 50_000 }, 201)
    const late = await api.call('PATCH', `/debts/${card.id}`, { startDate: '2026-10-01' })
    expect(late.status).toBe(422)
    expect(late.body.fields.startDate).toBe('Hay registros anteriores a esa fecha')

    const moved = await api.ok('PATCH', `/debts/${card.id}`, { startDate: '2026-09-05' })
    expect(moved.balance).toBe(1_050_000)
    const detail = await api.ok('GET', `/debts/${card.id}`)
    expect(detail.monthly.at(-1).balanceEnd).toBe(detail.debt.balance)
    expect(detail.monthly).toEqual([
      { month: '2026-09', paid: 0, charged: 50_000, balanceEnd: 1_050_000 },
      { month: '2026-10', paid: 0, charged: 0, balanceEnd: 1_050_000 },
    ])
  })

  it('extends the monthly rows to a future movement so the last row closes at the balance', async () => {
    const card = await debt({ name: 'BBVA 1', initialBalance: 1_000_000, fixedExpenseId: bbva })
    await api.ok('POST', `/debts/${card.id}/entries`, { date: '2026-12-05', type: 'cargo', amount: 50_000 }, 201)
    await pay(bbva, '2026-11', 200_000, '2026-11-20')
    const detail = await api.ok('GET', `/debts/${card.id}`)
    expect(detail.debt.balance).toBe(850_000)
    expect(detail.monthly.at(-1).balanceEnd).toBe(detail.debt.balance)
    expect(detail.monthly).toEqual([
      { month: '2026-09', paid: 0, charged: 0, balanceEnd: 1_000_000 },
      { month: '2026-10', paid: 0, charged: 0, balanceEnd: 1_000_000 },
      { month: '2026-11', paid: 200_000, charged: 0, balanceEnd: 800_000 },
      { month: '2026-12', paid: 0, charged: 50_000, balanceEnd: 850_000 },
    ])
  })

  it('deleting the debt keeps the fixed expense and its payments as they were', async () => {
    const card = await debt({ name: 'BBVA 1', initialBalance: 10, fixedExpenseId: bbva })
    await pay(bbva, '2026-10', 5, '2026-10-03')
    await api.ok('DELETE', `/debts/${card.id}`, undefined, 204)
    expect((await api.ok('GET', '/debts')).debts).toEqual([])
    expect((await api.ok('GET', '/fixed?month=2026-10')).items[0]).toMatchObject({ status: 'paid', paidAmount: 5 })
    expect((await api.call('GET', `/debts/${card.id}`)).status).toBe(404)
  })

  it('refuses to delete a linked fixed expense (409) so its payments do not vanish from the balance', async () => {
    const card = await debt({ name: 'BBVA 1', initialBalance: 1_000_000, fixedExpenseId: bbva })
    await pay(bbva, '2026-09', 300_000, '2026-09-10')
    const response = await api.call('DELETE', `/fixed/${bbva}`)
    expect(response.status).toBe(409)
    expect(response.body.error).toBe('Ese gasto fijo está enlazado a la deuda "BBVA 1"; desenlázalo primero.')
    const after = await api.ok('GET', `/debts/${card.id}`)
    expect(after.debt).toMatchObject({ balance: 700_000, fixedExpenseId: bbva })
    expect((await api.ok('GET', '/fixed?month=2026-09')).items[0]).toMatchObject({ status: 'paid', paidAmount: 300_000 })

    await api.ok('PATCH', `/debts/${card.id}`, { fixedExpenseId: null })
    await api.ok('DELETE', `/fixed/${bbva}`, undefined, 204)
  })

  it('survives a backup round trip', async () => {
    const card = await debt({ name: 'Rappi', initialBalance: 777 })
    await api.ok('POST', `/debts/${card.id}/entries`, { date: '2026-10-02', type: 'cargo', amount: 23 }, 201)
    const file = await api.ok('GET', '/backup')
    expect(file.debts).toHaveLength(1)
    expect(file.debtEntries).toHaveLength(1)
    await api.ok('POST', '/backup/restore', file)
    expect((await api.ok('GET', '/debts')).debts[0].balance).toBe(800)
  })

  it('restores a backup made before debts existed', async () => {
    const file = await api.ok('GET', '/backup')
    delete file.debts
    delete file.debtEntries
    await api.ok('POST', '/backup/restore', file)
    expect((await api.ok('GET', '/debts')).debts).toEqual([])
  })
})

import { createTestApi, type TestApi } from './helpers.ts'

describe('fixed expenses checklist', () => {
  let api: TestApi
  let bank: number
  let housing: number

  beforeEach(async () => {
    api = createTestApi('2026-03-15')
    bank = await api.account('Banco', 5_000_000)
    housing = await api.category('Vivienda', 'expense', 'fijos')
  })

  const month = (m: string) => api.ok('GET', `/fixed?month=${m}`)
  const itemOf = async (m: string, id: number) => (await month(m)).items.find((item: any) => item.fixed.id === id)
  const pay = (id: number, body: Record<string, unknown>) =>
    api.ok('POST', `/fixed/${id}/pay`, { month: '2026-03', accountId: bank, ...body }, 201)

  it('goes pending -> paid -> pending again when the payment is undone', async () => {
    const rent = await api.fixed({ name: 'Arriendo', amount: 900_000, dueDay: 20, categoryId: housing })

    expect(await itemOf('2026-03', rent)).toMatchObject({
      month: '2026-03',
      expectedAmount: 900_000,
      hasOverride: false,
      paidAmount: 0,
      status: 'pending',
      dueDate: '2026-03-20',
      paidDate: null,
      transactionIds: [],
    })

    const paid = await pay(rent, { amount: 920_000, date: '2026-03-14' })
    expect(paid).toMatchObject({ status: 'paid', paidAmount: 920_000, expectedAmount: 900_000, paidDate: '2026-03-14' })
    const [payment] = await api.ok('GET', '/transactions')
    expect(payment).toMatchObject({
      id: paid.transactionIds[0],
      type: 'expense',
      amount: 920_000,
      date: '2026-03-14',
      accountId: bank,
      categoryId: housing,
      description: 'Arriendo',
      fixedExpenseId: rent,
      fixedMonth: '2026-03',
    })
    expect((await api.ok('GET', '/accounts'))[0].balance).toBe(4_080_000)

    const undone = await api.ok('DELETE', `/fixed/${rent}/pay?month=2026-03`)
    expect(undone).toMatchObject({ status: 'pending', paidAmount: 0, paidDate: null, transactionIds: [] })
    expect(await api.ok('GET', '/transactions')).toEqual([])
    expect((await api.ok('GET', '/accounts'))[0].balance).toBe(5_000_000)
  })

  it('keeps a partially paid month pending, owing the rest, until the payments cover the expected amount', async () => {
    const salary = await api.category('Salario', 'income')
    await api.income('2026-03-01', 2_000_000, bank, salary)
    const house = await api.fixed({ name: 'Casa', amount: 500_000, dueDay: 20, categoryId: housing })

    const first = await pay(house, { amount: 200_000, date: '2026-03-05' })
    expect(first).toMatchObject({ status: 'pending', paidAmount: 200_000, expectedAmount: 500_000, paidDate: null })
    expect((await month('2026-03')).totals).toEqual({
      expected: 500_000,
      paid: 200_000,
      pending: 300_000,
      countPaid: 0,
      countTotal: 1,
    })
    // 2.000.000 of income - 200.000 paid - 300.000 still owed
    expect(await api.ok('GET', '/summary?month=2026-03')).toMatchObject({ pendingFixed: 300_000, availableToSpend: 1_500_000 })
    // a partial payment does not stop the month from becoming overdue
    api.clock.today = '2026-03-21'
    expect((await itemOf('2026-03', house)).status).toBe('overdue')

    const second = await pay(house, { amount: 300_000, date: '2026-03-22' })
    expect(second).toMatchObject({ status: 'paid', paidAmount: 500_000, paidDate: '2026-03-22' })
    expect(second.transactionIds).toHaveLength(2)
    expect((await month('2026-03')).totals).toEqual({ expected: 500_000, paid: 500_000, pending: 0, countPaid: 1, countTotal: 1 })
    expect((await api.ok('GET', '/summary?month=2026-03')).pendingFixed).toBe(0)
  })

  it('settles a month with nothing expected on any payment', async () => {
    const card = await api.fixed({ name: 'Tarjeta', amount: 0, variableAmount: true, categoryId: housing })
    expect(await pay(card, { amount: 130_000, date: '2026-03-12' })).toMatchObject({ status: 'paid', paidAmount: 130_000 })
  })

  it('is overdue once the due date is before today (injected clock)', async () => {
    const rent = await api.fixed({ name: 'Arriendo', amount: 900_000, dueDay: 15, categoryId: housing })
    const noDueDay = await api.fixed({ name: 'Diezmo', amount: 120_000, categoryId: housing })

    // due today is still pending
    expect((await itemOf('2026-03', rent)).status).toBe('pending')
    api.clock.today = '2026-03-16'
    expect((await itemOf('2026-03', rent)).status).toBe('overdue')
    // without due day it only becomes overdue when its month is over
    expect((await itemOf('2026-03', noDueDay)).status).toBe('pending')
    expect((await itemOf('2026-02', noDueDay)).status).toBe('overdue')
    api.clock.today = '2026-04-01'
    expect((await itemOf('2026-03', noDueDay)).status).toBe('overdue')
    // a future month is never overdue
    expect((await itemOf('2026-05', rent)).status).toBe('pending')
  })

  it('clamps dueDay 31 to the last day of the month', async () => {
    const rent = await api.fixed({ name: 'Arriendo', amount: 900_000, dueDay: 31, categoryId: housing, startMonth: '2026-01' })
    expect((await itemOf('2026-02', rent)).dueDate).toBe('2026-02-28')
    expect((await itemOf('2028-02', rent)).dueDate).toBe('2028-02-29')
    expect((await itemOf('2026-04', rent)).dueDate).toBe('2026-04-30')
    expect((await itemOf('2026-03', rent)).dueDate).toBe('2026-03-31')
  })

  it('only lists a fixed expense inside its start/end range', async () => {
    const loan = await api.fixed({ name: 'Crédito', amount: 300_000, categoryId: housing, startMonth: '2026-02', endMonth: '2026-04' })
    const names = async (m: string) => (await month(m)).items.map((item: any) => item.fixed.name)
    expect(await names('2026-01')).toEqual([])
    expect(await names('2026-02')).toEqual(['Crédito'])
    expect(await names('2026-04')).toEqual(['Crédito'])
    expect(await names('2026-05')).toEqual([])

    const outside = await api.call('POST', `/fixed/${loan}/pay`, { month: '2026-05', amount: 300_000, date: '2026-05-02', accountId: bank })
    expect(outside.status).toBe(422)
    expect(outside.body.fields).toEqual({ month: 'Este gasto fijo no aplica para ese mes' })
    const reversed = await api.call('PATCH', `/fixed/${loan}`, { endMonth: '2026-01' })
    expect(reversed.body.fields).toEqual({ endMonth: 'El mes final no puede ser anterior al inicial' })
  })

  it('DELETE /fixed/:id/pay demands the month instead of guessing the current one', async () => {
    const rent = await api.fixed({ name: 'Arriendo', amount: 900_000, categoryId: housing, startMonth: '2026-02' })
    await pay(rent, { amount: 930_000, date: '2026-03-04' })

    const noMonth = await api.call('DELETE', `/fixed/${rent}/pay`)
    expect(noMonth.status).toBe(422)
    expect(noMonth.body.fields).toEqual({ month: 'Indica el mes (YYYY-MM)' })
    const outside = await api.call('DELETE', `/fixed/${rent}/pay?month=2026-01`)
    expect(outside.status).toBe(422)
    expect(outside.body.fields).toEqual({ month: 'Este gasto fijo no aplica para ese mes' })
    expect(await itemOf('2026-03', rent)).toMatchObject({ status: 'paid', paidAmount: 930_000 })
    expect(await api.ok('GET', '/transactions')).toHaveLength(1)
  })

  it('refuses to cut a month with payments out of the range, and drops the overrides left outside', async () => {
    const loan = await api.fixed({ name: 'Crédito', amount: 500_000, categoryId: housing, startMonth: '2026-05' })
    await pay(loan, { month: '2026-06', amount: 510_000, date: '2026-06-03' })
    await api.ok('PUT', `/fixed/${loan}/months/2026-07`, { expectedAmount: 450_000 })
    const june = await month('2026-06')
    expect(june.totals).toMatchObject({ paid: 510_000, countPaid: 1 })

    const laterStart = await api.call('PATCH', `/fixed/${loan}`, { startMonth: '2026-09' })
    expect(laterStart.status).toBe(422)
    expect(laterStart.body.fields).toEqual({ startMonth: 'Hay pagos registrados fuera de ese rango' })
    const earlierEnd = await api.call('PATCH', `/fixed/${loan}`, { endMonth: '2026-05' })
    expect(earlierEnd.status).toBe(422)
    expect(earlierEnd.body.fields).toEqual({ endMonth: 'Hay pagos registrados fuera de ese rango' })
    expect(await month('2026-06')).toEqual(june)
    expect((await api.ok('GET', '/backup')).fixedMonths).toHaveLength(1)

    // ending right on the paid month is fine; the July override falls outside and goes away
    expect(await api.ok('PATCH', `/fixed/${loan}`, { endMonth: '2026-06' })).toMatchObject({ startMonth: '2026-05', endMonth: '2026-06' })
    expect((await api.ok('GET', '/backup')).fixedMonths).toEqual([])
    expect((await month('2026-06')).totals).toMatchObject({ paid: 510_000, countPaid: 1 })

    // without payments the range moves freely and only the overrides outside it are dropped
    const gym = await api.fixed({ name: 'Gimnasio', amount: 80_000, categoryId: housing, startMonth: '2026-05' })
    await api.ok('PUT', `/fixed/${gym}/months/2026-06`, { expectedAmount: 85_000 })
    await api.ok('PUT', `/fixed/${gym}/months/2026-10`, { expectedAmount: 90_000 })
    expect((await api.ok('PATCH', `/fixed/${gym}`, { startMonth: '2026-09' })).startMonth).toBe('2026-09')
    expect((await api.ok('GET', '/backup')).fixedMonths.map((row: any) => [row.fixed_id, row.month, row.expected_amount])).toEqual([
      [gym, '2026-10', 90_000],
    ])
  })

  it('counts a payment for its fixedMonth even when its date falls in another month', async () => {
    const rent = await api.fixed({ name: 'Arriendo', amount: 900_000, dueDay: 5, categoryId: housing })
    await pay(rent, { month: '2026-04', amount: 910_000, date: '2026-03-30' })

    expect(await itemOf('2026-04', rent)).toMatchObject({ status: 'paid', paidAmount: 910_000, paidDate: '2026-03-30' })
    expect(await itemOf('2026-03', rent)).toMatchObject({ status: 'overdue', paidAmount: 0 })
    // the money left in March, so March is where the expense shows
    expect((await api.ok('GET', '/summary?month=2026-03')).expenses).toBe(910_000)
    expect((await api.ok('GET', '/summary?month=2026-04')).expenses).toBe(0)
  })

  it('rejects a payment dated on a day that does not exist', async () => {
    const rent = await api.fixed({ name: 'Arriendo', amount: 900_000, dueDay: 20, categoryId: housing })
    const response = await api.call('POST', `/fixed/${rent}/pay`, { month: '2026-03', amount: 900_000, date: '2026-02-30', accountId: bank })
    expect(response.status).toBe(422)
    expect(response.body.fields).toEqual({ date: 'Esa fecha no existe en el calendario' })
    expect((await itemOf('2026-03', rent)).status).toBe('pending')
  })

  it('applies a month override of the amount and removes it with null', async () => {
    const power = await api.fixed({ name: 'Energía', amount: 150_000, variableAmount: true, categoryId: housing })

    const overridden = await api.ok('PUT', `/fixed/${power}/months/2026-03`, { expectedAmount: 187_300 })
    expect(overridden).toMatchObject({ expectedAmount: 187_300, hasOverride: true, status: 'pending' })
    expect(await itemOf('2026-04', power)).toMatchObject({ expectedAmount: 150_000, hasOverride: false })
    expect((await month('2026-03')).totals).toMatchObject({ expected: 187_300, pending: 187_300 })

    const cleared = await api.ok('PUT', `/fixed/${power}/months/2026-03`, { expectedAmount: null })
    expect(cleared).toMatchObject({ expectedAmount: 150_000, hasOverride: false })
    expect((await api.call('PUT', `/fixed/${power}/months/2026-3`, { skipped: true })).status).toBe(422)
  })

  it('marks a month as skipped without losing the amount override', async () => {
    const gym = await api.fixed({ name: 'Gimnasio', amount: 80_000, dueDay: 1, categoryId: housing })
    await api.ok('PUT', `/fixed/${gym}/months/2026-03`, { expectedAmount: 95_000 })

    const skipped = await api.ok('PUT', `/fixed/${gym}/months/2026-03`, { skipped: true })
    expect(skipped).toMatchObject({ status: 'skipped', expectedAmount: 95_000, hasOverride: true })
    expect((await month('2026-03')).totals).toEqual({ expected: 0, paid: 0, pending: 0, countPaid: 0, countTotal: 0 })

    const back = await api.ok('PUT', `/fixed/${gym}/months/2026-03`, { skipped: false })
    expect(back).toMatchObject({ status: 'overdue', expectedAmount: 95_000 })
    // paying a skipped month brings it back
    await api.ok('PUT', `/fixed/${gym}/months/2026-03`, { skipped: true })
    expect(await pay(gym, { amount: 95_000, date: '2026-03-15' })).toMatchObject({ status: 'paid', paidAmount: 95_000 })
  })

  it('refuses to skip a month that already has a payment (409), so the paid money stays in the totals', async () => {
    const rent = await api.fixed({ name: 'Arriendo', amount: 900_000, dueDay: 20, categoryId: housing })
    await pay(rent, { amount: 915_000, date: '2026-03-02' })

    const response = await api.call('PUT', `/fixed/${rent}/months/2026-03`, { skipped: true })
    expect(response.status).toBe(409)
    expect((await itemOf('2026-03', rent)).status).toBe('paid')
    expect((await month('2026-03')).totals).toMatchObject({ paid: 915_000, countPaid: 1, countTotal: 1 })

    // Once the payment is undone the month can be skipped.
    await api.ok('DELETE', `/fixed/${rent}/pay?month=2026-03`)
    expect((await api.ok('PUT', `/fixed/${rent}/months/2026-03`, { skipped: true })).status).toBe('skipped')
  })

  it('computes the totals from what was paid and what is still expected', async () => {
    const rent = await api.fixed({ name: 'Arriendo', amount: 900_000, dueDay: 5, categoryId: housing })
    const net = await api.fixed({ name: 'Internet', amount: 95_000, dueDay: 25, categoryId: housing })
    const power = await api.fixed({ name: 'Energía', amount: 150_000, dueDay: 10, categoryId: housing })
    const gym = await api.fixed({ name: 'Gimnasio', amount: 80_000, categoryId: housing })
    await pay(rent, { amount: 870_000, date: '2026-03-04' })
    await pay(net, { amount: 97_000, date: '2026-03-06' })
    await api.ok('PUT', `/fixed/${power}/months/2026-03`, { expectedAmount: 187_300 })
    await api.ok('PUT', `/fixed/${gym}/months/2026-03`, { skipped: true })

    const response = await month('2026-03')
    expect(response.items.map((item: any) => [item.fixed.id, item.status])).toEqual([
      [rent, 'overdue'],
      [net, 'paid'],
      [power, 'overdue'],
      [gym, 'skipped'],
    ])
    // paid = 870.000 (partial) + 97.000; pending = 30.000 left of Arriendo + 187.300 (the skipped one is out)
    expect(response.totals).toEqual({
      expected: 1_184_300,
      paid: 967_000,
      pending: 217_300,
      countPaid: 1,
      countTotal: 3,
    })
  })

  it('puts a new fixed expense last and PUT /fixed/order rewrites the positions', async () => {
    const a = await api.fixed({ name: 'A', amount: 1_000, categoryId: housing })
    const b = await api.fixed({ name: 'B', amount: 2_000, categoryId: housing })
    const c = await api.fixed({ name: 'C', amount: 3_000, categoryId: housing })
    const order = async () => (await month('2026-03')).items.map((item: any) => [item.fixed.name, item.fixed.position])
    expect(await order()).toEqual([['A', 1], ['B', 2], ['C', 3]])

    expect((await api.call('PUT', '/fixed/order', { ids: [c, a, b] })).status).toBe(204)
    expect(await order()).toEqual([['C', 1], ['A', 2], ['B', 3]])
    await api.fixed({ name: 'D', amount: 4_000, categoryId: housing })
    expect(await order()).toEqual([['C', 1], ['A', 2], ['B', 3], ['D', 4]])
    expect((await api.call('PUT', '/fixed/order', { ids: [a, 999] })).status).toBe(422)
  })

  it('keeps the payments as plain movements when the fixed expense is deleted', async () => {
    const rent = await api.fixed({ name: 'Arriendo', amount: 900_000, categoryId: housing })
    await pay(rent, { amount: 900_000, date: '2026-03-04' })
    await api.ok('PUT', `/fixed/${rent}/months/2026-04`, { expectedAmount: 950_000 })

    expect((await api.call('DELETE', `/fixed/${rent}`)).status).toBe(204)
    expect((await month('2026-03')).items).toEqual([])
    const [movement] = await api.ok('GET', '/transactions')
    expect(movement).toMatchObject({ amount: 900_000, description: 'Arriendo', fixedExpenseId: null, fixedMonth: null })
    const backup = await api.ok('GET', '/backup')
    expect(backup.fixedMonths).toEqual([])
    expect((await api.call('DELETE', `/fixed/${rent}`)).status).toBe(404)
  })

  it('PATCH /transactions/:id keeps the link to the fixed expense', async () => {
    const rent = await api.fixed({ name: 'Arriendo', amount: 900_000, categoryId: housing })
    const paid = await pay(rent, { amount: 900_000, date: '2026-03-04' })
    const id = paid.transactionIds[0]
    const body = { date: '2026-03-06', amount: 905_000, type: 'expense', accountId: bank, categoryId: housing, description: 'Arriendo marzo' }

    const updated = await api.ok('PATCH', `/transactions/${id}`, body)
    expect(updated).toMatchObject({ amount: 905_000, date: '2026-03-06', fixedExpenseId: rent, fixedMonth: '2026-03' })
    expect(await itemOf('2026-03', rent)).toMatchObject({ status: 'paid', paidAmount: 905_000, paidDate: '2026-03-06' })

    const salary = await api.category('Salario', 'income')
    const asIncome = await api.call('PATCH', `/transactions/${id}`, { ...body, type: 'income', categoryId: salary })
    expect(asIncome.status).toBe(422)
  })

  it('validates the category and account of a fixed expense', async () => {
    const salary = await api.category('Salario', 'income')
    const wrongKind = await api.call('POST', '/fixed', { name: 'X', amount: 1, categoryId: salary, startMonth: '2026-01' })
    expect(wrongKind.status).toBe(422)
    expect(wrongKind.body.fields).toEqual({ categoryId: 'Elige una categoría de gastos' })
    const missing = await api.call('POST', '/fixed', { name: 'X', amount: 1, categoryId: housing, accountId: 999, startMonth: '2026-01' })
    expect(missing.body.fields).toEqual({ accountId: 'La cuenta no existe' })

    const id = await api.fixed({ name: 'Arriendo', amount: 900_000, dueDay: 5, categoryId: housing, accountId: bank })
    const patched = await api.ok('PATCH', `/fixed/${id}`, { amount: 950_000 })
    expect(patched).toEqual({
      id,
      name: 'Arriendo',
      amount: 950_000,
      variableAmount: false,
      dueDay: 5,
      categoryId: housing,
      accountId: bank,
      startMonth: '2026-01',
      endMonth: null,
      note: '',
      position: 1,
    })
  })
})

import { createTestApi, type TestApi } from './helpers.ts'

describe('accounts', () => {
  let api: TestApi
  beforeEach(() => {
    api = createTestApi()
  })

  it('computes the balance from initial balance, income, expenses and transfers', async () => {
    const bank = await api.account('Banco', 1_000_000)
    const cash = await api.account('Efectivo', 50_000, 'efectivo')
    const salary = await api.category('Salario', 'income')
    const food = await api.category('Mercado', 'expense')
    await api.income('2026-03-01', 3_200_000, bank, salary)
    await api.expense('2026-03-02', 450_000, bank, food)
    await api.transfer('2026-03-03', 300_000, bank, cash)
    await api.expense('2025-11-20', 70_000, cash, food)

    const accounts = await api.ok('GET', '/accounts')
    expect(accounts.map((a: any) => [a.name, a.balance])).toEqual([
      ['Banco', 3_450_000],
      ['Efectivo', 280_000],
    ])
  })

  it('allows a negative initial balance and a negative balance', async () => {
    const card = await api.account('Tarjeta', -800_000, 'tarjeta')
    const food = await api.category('Mercado', 'expense')
    await api.expense('2026-03-02', 150_000, card, food)
    const [account] = await api.ok('GET', '/accounts')
    expect(account).toMatchObject({ initialBalance: -800_000, balance: -950_000, archived: false })
  })

  it('PATCH changes only the fields sent', async () => {
    const id = await api.account('Banco', 1_000_000)
    await api.ok('PATCH', `/accounts/${id}`, { archived: true })
    const renamed = await api.ok('PATCH', `/accounts/${id}`, { name: 'Bancolombia' })
    expect(renamed).toEqual({
      id,
      name: 'Bancolombia',
      type: 'ahorros',
      initialBalance: 1_000_000,
      archived: true,
      balance: 1_000_000,
    })
  })

  it('refuses to delete an account in use (409) and deletes an unused one', async () => {
    const bank = await api.account('Banco')
    const cash = await api.account('Efectivo')
    const spare = await api.account('Sin uso')
    await api.transfer('2026-03-03', 300_000, bank, cash)

    const asDestination = await api.call('DELETE', `/accounts/${cash}`)
    expect(asDestination.status).toBe(409)
    expect(asDestination.body.error).toContain('archívala en su lugar')
    expect((await api.call('DELETE', `/accounts/${spare}`)).status).toBe(204)
    expect((await api.call('DELETE', `/accounts/${spare}`)).status).toBe(404)
    expect((await api.call('DELETE', '/accounts/abc')).status).toBe(404)
  })

  it('answers 422 with the field map on invalid input', async () => {
    const response = await api.call('POST', '/accounts', { name: '  ', type: 'banco', extra: 1 })
    expect(response.status).toBe(422)
    expect(Object.keys(response.body.fields).sort()).toEqual(['extra', 'name', 'type'])
    expect(response.body.fields.name).toBe('Ponle un nombre')
  })
})

describe('transactions', () => {
  let api: TestApi
  let bank: number
  let cash: number
  let salary: number
  let food: number

  beforeEach(async () => {
    api = createTestApi()
    bank = await api.account('Banco')
    cash = await api.account('Efectivo')
    salary = await api.category('Salario', 'income')
    food = await api.category('Mercado', 'expense')
  })

  const post = (body: Record<string, unknown>) =>
    api.call('POST', '/transactions', { date: '2026-03-10', amount: 25_000, accountId: bank, ...body })

  it('rejects an expense without category', async () => {
    const response = await post({ type: 'expense' })
    expect(response.status).toBe(422)
    expect(response.body.fields).toEqual({ categoryId: 'Elige una categoría' })
  })

  it('rejects a category of the wrong kind', async () => {
    const expenseWithIncome = await post({ type: 'expense', categoryId: salary })
    expect(expenseWithIncome.status).toBe(422)
    expect(expenseWithIncome.body.fields).toEqual({ categoryId: 'Elige una categoría de gastos' })
    const incomeWithExpense = await post({ type: 'income', categoryId: food })
    expect(incomeWithExpense.body.fields).toEqual({ categoryId: 'Elige una categoría de ingresos' })
  })

  it('rejects a transfer to the same account', async () => {
    const response = await post({ type: 'transfer', toAccountId: bank })
    expect(response.status).toBe(422)
    expect(response.body.fields).toEqual({ toAccountId: 'La cuenta destino debe ser distinta' })
  })

  it('rejects references that do not exist, naming the field', async () => {
    const response = await post({ type: 'expense', accountId: 999, categoryId: 998 })
    expect(response.status).toBe(422)
    expect(response.body.fields).toEqual({ accountId: 'La cuenta no existe', categoryId: 'La categoría no existe' })
    const transfer = await post({ type: 'transfer', toAccountId: 997 })
    expect(transfer.body.fields).toEqual({ toAccountId: 'La cuenta destino no existe' })
  })

  it('rejects non-integer and zero amounts, and a broken JSON body', async () => {
    expect((await post({ type: 'expense', categoryId: food, amount: 10.5 })).status).toBe(422)
    expect((await post({ type: 'expense', categoryId: food, amount: 0 })).status).toBe(422)
    const response = await api.call('POST', '/transactions')
    expect(response.status).toBe(422)
  })

  it('lists newest first and filters by month, range, type, account and text', async () => {
    const a = await api.expense('2026-03-10', 11_000, bank, food, 'Café Juan Valdez')
    const b = await api.expense('2026-03-10', 12_000, cash, food, 'Panadería')
    const c = await api.income('2026-03-01', 13_000, bank, salary, 'Quincena')
    const d = await api.transfer('2026-02-27', 14_000, bank, cash)
    const e = await api.expense('2026-02-14', 15_000, bank, food, 'Regalo')
    await api.ok('PATCH', `/transactions/${e.id}`, { ...pick(e), note: 'incluye CAFE de grano' })

    const ids = async (query: string) => (await api.ok('GET', `/transactions${query}`)).map((t: any) => t.id)
    expect(await ids('')).toEqual([b.id, a.id, c.id, d.id, e.id])
    expect(await ids('?month=2026-03')).toEqual([b.id, a.id, c.id])
    // month wins over from/to
    expect(await ids('?month=2026-02&from=2026-03-01&to=2026-03-31')).toEqual([d.id, e.id])
    expect(await ids('?from=2026-02-27&to=2026-03-01')).toEqual([c.id, d.id])
    expect(await ids('?type=expense')).toEqual([b.id, a.id, e.id])
    // the account filter includes transfers where it is the destination
    expect(await ids(`?accountId=${cash}`)).toEqual([b.id, d.id])
    expect(await ids(`?categoryId=${salary}`)).toEqual([c.id])
    // case-insensitive, over description and note
    expect(await ids('?q=café')).toEqual([a.id, e.id])
    expect(await ids('?q=PANAD')).toEqual([b.id])
    expect((await api.call('GET', '/transactions?month=2026-13')).status).toBe(422)
  })

  it('PATCH replaces the whole movement and DELETE removes it', async () => {
    const created = await api.expense('2026-03-10', 11_000, bank, food, 'Café')
    const updated = await api.ok('PATCH', `/transactions/${created.id}`, {
      date: '2026-03-11',
      amount: 13_500,
      type: 'income',
      accountId: cash,
      categoryId: salary,
    })
    expect(updated).toMatchObject({
      id: created.id,
      date: '2026-03-11',
      amount: 13_500,
      type: 'income',
      accountId: cash,
      categoryId: salary,
      toAccountId: null,
      description: '',
      fixedExpenseId: null,
      fixedMonth: null,
      createdAt: created.createdAt,
    })
    expect((await api.call('PATCH', '/transactions/999', pick(created))).status).toBe(404)
    expect((await api.call('DELETE', `/transactions/${created.id}`)).status).toBe(204)
    expect(await api.ok('GET', '/transactions')).toEqual([])
  })

  it('bulk-categorize only touches movements of the category kind', async () => {
    const other = await api.category('Restaurantes', 'expense')
    const a = await api.expense('2026-03-10', 11_000, bank, food)
    const b = await api.expense('2026-03-11', 12_000, bank, food)
    const c = await api.income('2026-03-01', 13_000, bank, salary)
    const d = await api.transfer('2026-03-02', 14_000, bank, cash)

    const result = await api.ok('POST', '/transactions/bulk-categorize', { ids: [a.id, b.id, c.id, d.id], categoryId: other })
    expect(result).toEqual({ updated: 2 })
    const rows = await api.ok('GET', '/transactions')
    expect(Object.fromEntries(rows.map((t: any) => [t.id, t.categoryId]))).toEqual({
      [a.id]: other,
      [b.id]: other,
      [c.id]: salary,
      [d.id]: null,
    })
    const missing = await api.call('POST', '/transactions/bulk-categorize', { ids: [a.id], categoryId: 999 })
    expect(missing.status).toBe(422)
  })
})

describe('categories', () => {
  it('refuses to delete a category in use (409) by a movement, a fixed expense or a budget', async () => {
    const api = createTestApi()
    const bank = await api.account('Banco')
    const withMovement = await api.category('Mercado', 'expense')
    const withFixed = await api.category('Vivienda', 'expense', 'fijos')
    const withBudget = await api.category('Compras', 'expense')
    const unused = await api.category('Sin uso', 'expense')
    await api.expense('2026-03-10', 11_000, bank, withMovement)
    await api.fixed({ name: 'Arriendo', amount: 900_000, categoryId: withFixed })
    await api.ok('PUT', '/budgets', { categoryId: withBudget, month: '2026-03', amount: 100_000 })

    for (const id of [withMovement, withFixed, withBudget]) {
      const response = await api.call('DELETE', `/categories/${id}`)
      expect(response.status).toBe(409)
      expect(response.body.error).toContain('archívala en su lugar')
    }
    expect((await api.call('DELETE', `/categories/${unused}`)).status).toBe(204)
    expect((await api.ok('GET', '/categories')).map((c: any) => c.name)).toEqual(['Mercado', 'Vivienda', 'Compras'])

    // archiving is the way out, and the kind of a used category cannot flip
    const archived = await api.ok('PATCH', `/categories/${withMovement}`, { archived: true })
    expect(archived).toMatchObject({ name: 'Mercado', kind: 'expense', group: 'variables', color: 'slate', archived: true })
    expect((await api.call('PATCH', `/categories/${withMovement}`, { kind: 'income' })).status).toBe(409)
  })
})

/** The editable fields of a movement, as the PATCH body expects them. */
function pick(t: any) {
  const { date, amount, type, accountId, toAccountId, categoryId, description, note } = t
  return { date, amount, type, accountId, toAccountId, categoryId, description, note }
}

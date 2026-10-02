import { createTestApi, type TestApi } from './helpers.ts'

describe('budgets', () => {
  let api: TestApi
  let bank: number
  let food: number
  let dining: number
  let shopping: number
  let fun: number

  beforeEach(async () => {
    api = createTestApi('2026-03-15')
    bank = await api.account('Banco')
    food = await api.category('Mercado', 'expense')
    dining = await api.category('Restaurantes', 'expense')
    shopping = await api.category('Compras', 'expense')
    fun = await api.category('Entretenimiento', 'expense')
    await api.expense('2026-03-03', 420_000, bank, food)
    await api.expense('2026-03-04', 80_000, bank, dining)
    await api.expense('2026-03-05', 130_000, bank, shopping)
    await api.expense('2026-03-06', 25_000, bank, fun)
    await api.expense('2026-02-06', 999_000, bank, food)
  })

  const setBudget = (categoryId: number, month: string, amount: number | null) =>
    api.ok('PUT', '/budgets', { categoryId, month, amount })
  const rowOf = async (month: string, categoryId: number) =>
    (await api.ok('GET', `/budgets?month=${month}`)).rows.find((row: any) => row.category.id === categoryId)

  it('inherits the budget from earlier months and derives ok / warning / over / none', async () => {
    await setBudget(food, '2026-01', 500_000)
    await setBudget(dining, '2026-02', 200_000)
    await setBudget(shopping, '2026-01', 100_000)

    const march = await api.ok('GET', '/budgets?month=2026-03')
    expect(march.rows.map((row: any) => [row.category.name, row.budget, row.spent, row.remaining, row.ratio, row.state])).toEqual([
      ['Mercado', 500_000, 420_000, 80_000, 0.84, 'warning'],
      ['Restaurantes', 200_000, 80_000, 120_000, 0.4, 'ok'],
      ['Compras', 100_000, 130_000, -30_000, 1.3, 'over'],
      ['Entretenimiento', null, 25_000, null, null, 'none'],
    ])
    // budget: 500 + 200 + 100; spent: every expense of the month; remaining: 800.000 - 630.000 budgeted spend
    expect(march.totals).toEqual({ budget: 800_000, spent: 655_000, remaining: 170_000 })

    // December is before any budget row
    expect((await rowOf('2025-12', food)).state).toBe('none')
    // January has the Mercado budget but not yet the Restaurantes one
    expect(await rowOf('2026-01', food)).toMatchObject({ budget: 500_000, spent: 0, state: 'ok', ratio: 0 })
    expect((await rowOf('2026-01', dining)).budget).toBeNull()
  })

  it('a later row replaces the budget from that month on, and null removes it', async () => {
    await setBudget(food, '2026-01', 500_000)
    const response = await setBudget(food, '2026-03', 600_000)
    expect(response.month).toBe('2026-03')
    expect(await rowOf('2026-03', food)).toMatchObject({ budget: 600_000, ratio: 0.7, state: 'ok' })
    expect(await rowOf('2026-02', food)).toMatchObject({ budget: 500_000, spent: 999_000, state: 'over' })

    await setBudget(food, '2026-04', null)
    expect(await rowOf('2026-04', food)).toMatchObject({ budget: null, remaining: null, state: 'none' })
    expect((await rowOf('2026-03', food)).budget).toBe(600_000)
    // same (category, month) again updates the row instead of duplicating it
    await setBudget(food, '2026-03', 420_000)
    expect(await rowOf('2026-03', food)).toMatchObject({ budget: 420_000, ratio: 1, state: 'warning', remaining: 0 })
    expect((await api.ok('GET', '/backup')).budgets).toHaveLength(3)
  })

  it('treats a zero budget with spending as over, with a null ratio', async () => {
    await setBudget(fun, '2026-03', 0)
    expect(await rowOf('2026-03', fun)).toMatchObject({ budget: 0, spent: 25_000, remaining: -25_000, ratio: null, state: 'over' })
    expect(await rowOf('2026-04', fun)).toMatchObject({ budget: 0, spent: 0, ratio: null, state: 'ok' })
  })

  it('shows archived categories only in months where they had spending', async () => {
    await api.ok('PATCH', `/categories/${fun}`, { archived: true })
    const names = async (month: string) => (await api.ok('GET', `/budgets?month=${month}`)).rows.map((row: any) => row.category.name)
    expect(await names('2026-03')).toEqual(['Mercado', 'Restaurantes', 'Compras', 'Entretenimiento'])
    expect(await names('2026-04')).toEqual(['Mercado', 'Restaurantes', 'Compras'])
  })

  it('rejects a budget on an income or missing category', async () => {
    const salary = await api.category('Salario', 'income')
    expect((await api.call('PUT', '/budgets', { categoryId: salary, month: '2026-03', amount: 1 })).status).toBe(422)
    expect((await api.call('PUT', '/budgets', { categoryId: 999, month: '2026-03', amount: 1 })).status).toBe(422)
  })
})

describe('summary', () => {
  let api: TestApi
  let summary: any
  let ids: Record<string, number>

  beforeEach(async () => {
    api = createTestApi('2026-03-15')
    const bank = await api.account('Banco', 100_000)
    const cash = await api.account('Efectivo', 20_000)
    const old = await api.account('Vieja', 7_000)
    await api.ok('PATCH', `/accounts/${old}`, { archived: true })
    const salary = await api.category('Salario', 'income')
    const food = await api.category('Mercado', 'expense')
    const dining = await api.category('Restaurantes', 'expense')
    const housing = await api.category('Vivienda', 'expense', 'fijos')

    await api.income('2026-02-05', 2_000_000, bank, salary)
    await api.expense('2026-02-10', 400_000, bank, food)
    await api.expense('2026-02-28', 100_000, bank, food)

    await api.income('2026-03-01', 2_500_000, bank, salary)
    await api.expense('2026-03-03', 300_000, bank, food)
    await api.transfer('2026-03-05', 500_000, bank, cash)
    await api.expense('2026-03-10', 120_000, cash, food)
    const last = await api.expense('2026-03-10', 80_000, cash, dining)

    const tithe = await api.fixed({ name: 'Diezmo', amount: 50_000, categoryId: housing })
    const internet = await api.fixed({ name: 'Internet', amount: 95_000, dueDay: 20, categoryId: housing })
    const rent = await api.fixed({ name: 'Arriendo', amount: 900_000, dueDay: 5, categoryId: housing })
    const gym = await api.fixed({ name: 'Gimnasio', amount: 68_000, dueDay: 2, categoryId: housing })
    await api.ok('POST', `/fixed/${gym}/pay`, { month: '2026-03', amount: 70_000, date: '2026-03-02', accountId: bank }, 201)

    ids = { bank, cash, food, dining, housing, tithe, internet, rent, gym, last: last.id }
    summary = await api.ok('GET', '/summary?month=2026-03')
  })

  it('totals income, expenses and net without counting transfers', () => {
    expect(summary).toMatchObject({
      month: '2026-03',
      income: 2_500_000,
      // 300.000 + 120.000 + 80.000 + 70.000 (fixed payment); the 500.000 transfer is not an expense
      expenses: 570_000,
      net: 1_930_000,
      savingsRate: 0.772,
    })
  })

  it('subtracts the unpaid fixed expenses to get what is available to spend', () => {
    // Arriendo 900.000 + Internet 95.000 + Diezmo 50.000; Gimnasio is paid
    expect(summary.pendingFixed).toBe(1_045_000)
    expect(summary.availableToSpend).toBe(885_000)
    expect(summary.upcomingFixed.map((item: any) => [item.fixed.name, item.status, item.dueDate])).toEqual([
      ['Arriendo', 'overdue', '2026-03-05'],
      ['Internet', 'pending', '2026-03-20'],
      ['Diezmo', 'pending', null],
    ])
  })

  it('compares against the previous month', async () => {
    expect(summary.previous).toEqual({ month: '2026-02', income: 2_000_000, expenses: 500_000, net: 1_500_000 })
    expect(summary.change).toEqual({ income: 0.25, expenses: 0.14 })
    const february = await api.ok('GET', '/summary?month=2026-02')
    expect(february.previous).toEqual({ month: '2026-01', income: 0, expenses: 0, net: 0 })
    expect(february.change).toEqual({ income: null, expenses: null })
    const empty = await api.ok('GET', '/summary?month=2025-06')
    expect(empty).toMatchObject({ income: 0, expenses: 0, net: 0, savingsRate: null, expensesByCategory: [], recent: [] })
  })

  it('groups by category, biggest first, with the share of the kind total', () => {
    expect(summary.expensesByCategory.map((row: any) => [row.category.name, row.total, row.count])).toEqual([
      ['Mercado', 420_000, 2],
      ['Restaurantes', 80_000, 1],
      ['Vivienda', 70_000, 1],
    ])
    expect(summary.expensesByCategory[0].share).toBeCloseTo(420 / 570, 10)
    expect(summary.incomeByCategory.map((row: any) => [row.category.name, row.total, row.share])).toEqual([
      ['Salario', 2_500_000, 1],
    ])
  })

  it('builds the daily series with a running total that stops at today', () => {
    expect(summary.daily).toHaveLength(31)
    const day = (n: number) => summary.daily[n - 1]
    expect(day(1)).toEqual({ date: '2026-03-01', spent: 0, cumulative: 0 })
    expect(day(2)).toEqual({ date: '2026-03-02', spent: 70_000, cumulative: 70_000 })
    expect(day(3)).toEqual({ date: '2026-03-03', spent: 300_000, cumulative: 370_000 })
    expect(day(5)).toEqual({ date: '2026-03-05', spent: 0, cumulative: 370_000 })
    expect(day(10)).toEqual({ date: '2026-03-10', spent: 200_000, cumulative: 570_000 })
    expect(day(15)).toEqual({ date: '2026-03-15', spent: 0, cumulative: 570_000 })
    expect(day(16)).toEqual({ date: '2026-03-16', spent: 0, cumulative: null })
    expect(day(31)).toEqual({ date: '2026-03-31', spent: 0, cumulative: null })

    expect(summary.previousDailyCumulative).toHaveLength(28)
    expect(summary.previousDailyCumulative[8]).toBe(0)
    expect(summary.previousDailyCumulative[9]).toBe(400_000)
    expect(summary.previousDailyCumulative[26]).toBe(400_000)
    expect(summary.previousDailyCumulative[27]).toBe(500_000)
  })

  it('a past month has its whole cumulative series', async () => {
    const february = await api.ok('GET', '/summary?month=2026-02')
    expect(february.daily).toHaveLength(28)
    expect(february.daily[27]).toEqual({ date: '2026-02-28', spent: 100_000, cumulative: 500_000 })
    expect(february.previousDailyCumulative).toEqual(Array(31).fill(0))
  })

  it('lists the recent movements and the active accounts with their balances', async () => {
    expect(summary.recent).toHaveLength(6)
    expect(summary.recent[0]).toMatchObject({ id: ids.last, amount: 80_000, date: '2026-03-10' })
    expect(summary.recent.map((t: any) => t.amount)).toEqual([80_000, 120_000, 500_000, 300_000, 70_000, 2_500_000])
    // Banco: 100.000 + 2.000.000 - 500.000 + 2.500.000 - 300.000 - 500.000 - 70.000
    // Efectivo: 20.000 + 500.000 - 120.000 - 80.000; the archived account is left out
    expect(summary.accounts.map((a: any) => [a.name, a.balance])).toEqual([
      ['Banco', 3_230_000],
      ['Efectivo', 320_000],
    ])
    expect(summary.totalBalance).toBe(3_550_000)

    const bank = ids.bank as number
    const food = ids.food as number
    for (let day = 11; day <= 14; day++) await api.expense(`2026-03-${day}`, 1_000 * day, bank, food)
    const more = await api.ok('GET', '/summary?month=2026-03')
    expect(more.recent).toHaveLength(8)
    expect(more.recent[0].amount).toBe(14_000)
  })

  it('defaults to the current month of the injected clock', async () => {
    expect((await api.ok('GET', '/summary')).month).toBe('2026-03')
    api.clock.today = '2026-04-02'
    expect((await api.ok('GET', '/summary')).month).toBe('2026-04')
  })
})

describe('reports', () => {
  let api: TestApi
  let food: number
  let dining: number

  beforeEach(async () => {
    api = createTestApi('2026-03-15')
    const bank = await api.account('Banco')
    const cash = await api.account('Efectivo')
    const salary = await api.category('Salario', 'income')
    food = await api.category('Mercado', 'expense')
    dining = await api.category('Restaurantes', 'expense')
    await api.category('Sin movimientos', 'expense')
    await api.income('2025-12-30', 1_800_000, bank, salary)
    await api.expense('2025-12-31', 210_000, bank, food)
    await api.expense('2026-01-15', 330_000, bank, dining)
    await api.income('2026-03-01', 2_500_000, bank, salary)
    await api.expense('2026-03-03', 300_000, bank, food)
    await api.expense('2026-03-09', 41_000, bank, food)
    await api.expense('2026-03-10', 80_000, bank, dining)
    await api.transfer('2026-03-11', 700_000, bank, cash)
  })

  it('monthly: oldest first, with zero rows for empty months', async () => {
    const rows = await api.ok('GET', '/reports/monthly?months=5')
    expect(rows).toEqual([
      { month: '2025-11', income: 0, expenses: 0, net: 0 },
      { month: '2025-12', income: 1_800_000, expenses: 210_000, net: 1_590_000 },
      { month: '2026-01', income: 0, expenses: 330_000, net: -330_000 },
      { month: '2026-02', income: 0, expenses: 0, net: 0 },
      { month: '2026-03', income: 2_500_000, expenses: 421_000, net: 2_079_000 },
    ])
    const until = await api.ok('GET', '/reports/monthly?months=2&until=2026-01')
    expect(until.map((row: any) => row.month)).toEqual(['2025-12', '2026-01'])
    expect(await api.ok('GET', '/reports/monthly')).toHaveLength(12)
    expect((await api.call('GET', '/reports/monthly?months=37')).status).toBe(422)
    expect((await api.call('GET', '/reports/monthly?months=0')).status).toBe(422)
  })

  it('categories: a category x month matrix sorted by total, with the rounded average', async () => {
    const report = await api.ok('GET', '/reports/categories?from=2025-12&to=2026-03&kind=expense')
    expect(report.months).toEqual(['2025-12', '2026-01', '2026-02', '2026-03'])
    expect(report.rows.map((row: any) => [row.category.id, row.totals, row.total, row.average])).toEqual([
      // 551.000 / 4 = 137.750 ; 410.000 / 4 = 102.500
      [food, [210_000, 0, 0, 341_000], 551_000, 137_750],
      [dining, [0, 330_000, 0, 80_000], 410_000, 102_500],
    ])

    const income = await api.ok('GET', '/reports/categories?from=2026-01&to=2026-03&kind=income')
    expect(income.rows.map((row: any) => [row.category.name, row.totals, row.average])).toEqual([
      // 2.500.000 / 3 = 833.333,33 -> 833.333
      ['Salario', [0, 0, 2_500_000], 833_333],
    ])
    const defaults = await api.ok('GET', '/reports/categories')
    expect(defaults.months).toHaveLength(12)
    expect(defaults.months[11]).toBe('2026-03')
    expect((await api.call('GET', '/reports/categories?from=2026-04&to=2026-03')).status).toBe(422)
  })
})

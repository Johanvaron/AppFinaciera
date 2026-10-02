import { createApp } from '../app.ts'
import { openDatabase } from '../db.ts'
import { addMonths, dueDateFor, monthRange } from '../lib/dates.ts'
import { seedDatabase } from '../seed.ts'
import { CATEGORY_COLORS } from '../../shared/contract.ts'
import { createTestApi, type TestApi } from './helpers.ts'

/** Fills a database with one of everything and returns the views a user would compare. */
async function populate(api: TestApi) {
  const bank = await api.account('Banco', 1_000_000)
  const cash = await api.account('Efectivo', 50_000, 'efectivo')
  const salary = await api.category('Salario', 'income')
  const housing = await api.category('Vivienda', 'expense', 'fijos')
  await api.income('2026-03-01', 3_200_000, bank, salary)
  await api.transfer('2026-03-03', 300_000, bank, cash)
  const rent = await api.fixed({ name: 'Arriendo', amount: 900_000, dueDay: 5, categoryId: housing, accountId: bank })
  await api.ok('POST', `/fixed/${rent}/pay`, { month: '2026-03', amount: 880_000, date: '2026-03-04', accountId: bank }, 201)
  await api.ok('PUT', `/fixed/${rent}/months/2026-04`, { expectedAmount: 950_000 })
  await api.ok('PUT', '/budgets', { categoryId: housing, month: '2026-01', amount: 1_200_000 })
}

async function snapshot(api: TestApi) {
  return {
    accounts: await api.ok('GET', '/accounts'),
    categories: await api.ok('GET', '/categories'),
    transactions: await api.ok('GET', '/transactions'),
    fixedMarch: await api.ok('GET', '/fixed?month=2026-03'),
    fixedApril: await api.ok('GET', '/fixed?month=2026-04'),
    budgets: await api.ok('GET', '/budgets?month=2026-03'),
  }
}

describe('backup', () => {
  it('exports a downloadable file and restores it into another database', async () => {
    const source = createTestApi('2026-03-15')
    await populate(source)
    const response = await source.call('GET', '/backup')
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="finanzas-2026-03-15.json"')
    const file = response.body
    expect(file).toMatchObject({ app: 'app-financiera', version: 1 })
    expect([file.accounts, file.categories, file.transactions, file.fixedExpenses, file.fixedMonths, file.budgets].map((t) => t.length)).toEqual([2, 2, 3, 1, 1, 1])
    expect(file.transactions[2]).toMatchObject({ amount: 880_000, fixed_expense_id: 1, fixed_month: '2026-03' })

    const target = createTestApi('2026-03-15')
    const stale = await target.account('Se va a borrar', 123)
    expect(await target.ok('POST', '/backup/restore', file)).toEqual({ restored: true })

    expect(await snapshot(target)).toEqual(await snapshot(source))
    const accounts = await target.ok('GET', '/accounts')
    expect(accounts.map((a: any) => [a.name, a.balance])).toEqual([
      ['Banco', 3_020_000],
      ['Efectivo', 350_000],
    ])
    expect(accounts.some((a: any) => a.name === 'Se va a borrar')).toBe(false)
    expect(stale).toBe(1)
  })

  it('rejects a file from another app or version without touching the data', async () => {
    const api = createTestApi()
    await populate(api)
    const before = await snapshot(api)
    const file = await api.ok('GET', '/backup')

    const wrongApp = await api.call('POST', '/backup/restore', { ...file, app: 'otra-app' })
    expect(wrongApp.status).toBe(422)
    expect(wrongApp.body.fields.app).toBe('Este archivo no es un respaldo de esta app')
    expect((await api.call('POST', '/backup/restore', { ...file, version: 2 })).status).toBe(422)
    expect((await api.call('POST', '/backup/restore', { ...file, budgets: undefined })).status).toBe(422)
    const badColumn = await api.call('POST', '/backup/restore', { ...file, accounts: [{ id: 1, 'name") --': 'x' }] })
    expect(badColumn.status).toBe(422)
    expect(await snapshot(api)).toEqual(before)
  })

  it('rolls everything back when a row is rejected half way', async () => {
    const api = createTestApi()
    await populate(api)
    const before = await snapshot(api)
    const file = await api.ok('GET', '/backup')
    // the last table points at a category that is not in the file
    const broken = { ...file, budgets: [{ id: 1, category_id: 999, month: '2026-01', amount: 5 }] }

    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})
    const response = await api.call('POST', '/backup/restore', broken)
    errorLog.mockRestore()
    expect(response.status).toBe(422)
    expect(response.body.error).toContain('no se cambió nada')
    expect(await snapshot(api)).toEqual(before)
  })

  it('rejects a hand-edited file with a malformed date or month, naming the row, without touching the data', async () => {
    const api = createTestApi()
    await populate(api)
    const before = await snapshot(api)
    const file = await api.ok('GET', '/backup')
    const edit = (key: string, index: number, change: Record<string, unknown>) => ({
      ...file,
      [key]: file[key].map((row: any, i: number) => (i === index ? { ...row, ...change } : row)),
    })

    const cases: [any, Record<string, string>][] = [
      [edit('transactions', 0, { date: 'no-es-fecha' }), { 'transactions.0.date': 'Fecha inválida (YYYY-MM-DD)' }],
      [edit('transactions', 1, { date: '2026-02-30' }), { 'transactions.1.date': 'Fecha inválida (YYYY-MM-DD)' }],
      [edit('transactions', 2, { fixed_month: '2026-13' }), { 'transactions.2.fixed_month': 'Mes inválido (YYYY-MM)' }],
      [edit('fixedExpenses', 0, { start_month: '0000-01', end_month: 'nunca' }), {
        'fixedExpenses.0.start_month': 'Mes inválido (YYYY-MM)',
        'fixedExpenses.0.end_month': 'Mes inválido (YYYY-MM)',
      }],
      [edit('fixedMonths', 0, { month: 202604 }), { 'fixedMonths.0.month': 'Mes inválido (YYYY-MM)' }],
      [edit('budgets', 0, { month: '2026-1' }), { 'budgets.0.month': 'Mes inválido (YYYY-MM)' }],
    ]
    for (const [broken, fields] of cases) {
      const response = await api.call('POST', '/backup/restore', broken)
      expect(response.status).toBe(422)
      expect(response.body).toEqual({ error: 'El respaldo tiene fechas inválidas; no se cambió nada.', fields })
      expect(await snapshot(api)).toEqual(before)
    }
    // the untouched file, with its null end_month and null fixed_month values, still restores
    expect(await api.ok('POST', '/backup/restore', file)).toEqual({ restored: true })
    expect(await snapshot(api)).toEqual(before)
  })
})

describe('cross-site writes', () => {
  it('refuses a write that is not sent as JSON (what a foreign page can send without a preflight)', async () => {
    const api = createTestApi()
    await api.account('Banco', 250_000)
    const before = await api.ok('GET', '/accounts')
    const body = JSON.stringify({ app: 'app-financiera', version: 1, accounts: [], categories: [], transactions: [], fixedExpenses: [], fixedMonths: [], budgets: [] })
    for (const headers of [{ 'Content-Type': 'text/plain' }, undefined]) {
      const response = await api.app.request('/api/backup/restore', { method: 'POST', body, ...(headers ? { headers } : {}) })
      expect(response.status).toBe(415)
      expect(await response.json()).toEqual({ error: 'El cuerpo debe enviarse como application/json' })
    }
    expect(before).toHaveLength(1)
    expect(await api.ok('GET', '/accounts')).toEqual(before)

    const json = await api.app.request('/api/backup/restore', { method: 'POST', body, headers: { 'Content-Type': 'application/json; charset=utf-8' } })
    expect(json.status).toBe(200)
  })
})

describe('database', () => {
  it('records the applied migrations and does not re-run them or the seed', () => {
    let created = 0
    const db = openDatabase(':memory:', { onCreate: () => created++ })
    const names = db.prepare('SELECT name FROM _migrations ORDER BY name').all().map((row) => row.name)
    expect(names).toEqual(['001-init.sql'])
    expect(created).toBe(1)
    expect(db.prepare('PRAGMA foreign_keys').get()).toEqual({ foreign_keys: 1 })
  })

  it('seeds a cash account and the generic categories, and nothing else', async () => {
    const db = openDatabase(':memory:', { onCreate: seedDatabase })
    const app = createApp(db)
    const get = async (path: string) => (await app.request(`/api${path}`)).json() as Promise<any>

    expect(await get('/accounts')).toEqual([
      { id: 1, name: 'Efectivo', type: 'efectivo', initialBalance: 0, archived: false, balance: 0 },
    ])
    const categories = await get('/categories')
    expect(categories).toHaveLength(17)
    expect(categories.filter((c: any) => c.group === 'ingresos').map((c: any) => [c.name, c.kind])).toEqual([
      ['Salario', 'income'],
      ['Negocio', 'income'],
      ['Otros ingresos', 'income'],
    ])
    expect(categories.find((c: any) => c.name === 'Ahorro')).toMatchObject({ kind: 'expense', group: 'ahorro' })
    expect(categories.every((c: any) => (CATEGORY_COLORS as readonly string[]).includes(c.color))).toBe(true)
    expect(new Set(categories.map((c: any) => c.color)).size).toBe(CATEGORY_COLORS.length)
    expect(await get('/transactions')).toEqual([])
    expect((await get('/fixed?month=2026-03')).items).toEqual([])
  })

  it('answers 404 with an ApiError for unknown routes', async () => {
    const api = createTestApi()
    const response = await api.call('GET', '/nope')
    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: 'Ruta no encontrada' })
  })
})

describe('date helpers', () => {
  it('moves across year boundaries and clamps due days', () => {
    expect(addMonths('2026-01', -1)).toBe('2025-12')
    expect(addMonths('2025-12', 1)).toBe('2026-01')
    expect(addMonths('2026-03', -11)).toBe('2025-04')
    expect(monthRange('2025-11', '2026-02')).toEqual(['2025-11', '2025-12', '2026-01', '2026-02'])
    expect(dueDateFor('2026-02', 30)).toBe('2026-02-28')
    expect(dueDateFor('2026-02', null)).toBeNull()
  })
})

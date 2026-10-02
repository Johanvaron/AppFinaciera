import type { Account, Category, Transaction } from '@shared/contract'
import { formatMoney } from '@/lib/format'
import {
  amountClass,
  amountText,
  applicableCategories,
  bulkCategoryRule,
  countLabel,
  deleteResultText,
  deleteWarning,
  filteredTotals,
  groupByDay,
  removeEach,
  rowView,
  sortTransactions,
} from './transactions'

let nextId = 1
function tx(partial: Partial<Transaction>): Transaction {
  return {
    id: nextId++,
    date: '2026-10-02',
    amount: 1000,
    type: 'expense',
    accountId: 1,
    toAccountId: null,
    categoryId: 10,
    description: '',
    note: '',
    fixedExpenseId: null,
    fixedMonth: null,
    createdAt: '2026-10-02T10:00:00',
    ...partial,
  }
}

const categories: Category[] = [
  { id: 10, name: 'Mercado', kind: 'expense', group: 'variables', color: 'green', archived: false },
  { id: 11, name: 'Arriendo', kind: 'expense', group: 'fijos', color: 'blue', archived: false },
  { id: 12, name: 'Viejo', kind: 'expense', group: 'variables', color: 'slate', archived: true },
  { id: 20, name: 'Salario', kind: 'income', group: 'ingresos', color: 'teal', archived: false },
]
const accounts: Account[] = [
  { id: 1, name: 'Nequi', type: 'billetera', initialBalance: 0, archived: false, balance: 0 },
  { id: 2, name: 'Bancolombia', type: 'ahorros', initialBalance: 0, archived: false, balance: 0 },
]
const categoryMap = new Map(categories.map((c) => [c.id, c]))
const accountMap = new Map(accounts.map((a) => [a.id, a]))

describe('filteredTotals', () => {
  it('sums income and expenses apart and leaves transfers out', () => {
    const totals = filteredTotals([
      tx({ type: 'income', amount: 1_250_000, categoryId: 20 }),
      tx({ type: 'expense', amount: 78_000 }),
      tx({ type: 'expense', amount: 22_500 }),
      tx({ type: 'transfer', amount: 300_000, toAccountId: 2, categoryId: null }),
    ])
    expect(formatMoney(totals.income)).toBe('$ 1.250.000')
    expect(formatMoney(totals.expenses)).toBe('$ 100.500')
    expect(formatMoney(totals.net)).toBe('$ 1.149.500')
    expect(countLabel(totals.count)).toBe('4 movimientos')
  })

  it('gives a negative net when more went out than came in', () => {
    const totals = filteredTotals([tx({ type: 'income', amount: 50_000 }), tx({ type: 'expense', amount: 78_000 })])
    expect(formatMoney(totals.net)).toBe('-$ 28.000')
  })

  it('is all zeros for an empty list', () => {
    expect(filteredTotals([])).toEqual({ income: 0, expenses: 0, net: 0, count: 0 })
    expect(countLabel(0)).toBe('0 movimientos')
    expect(countLabel(1)).toBe('1 movimiento')
  })
})

describe('amountText / amountClass', () => {
  it('signs by type', () => {
    expect(amountText('income', 1_250_000)).toBe('+$ 1.250.000')
    expect(amountText('expense', 78_000)).toBe('-$ 78.000')
    expect(amountText('transfer', 300_000)).toBe('$ 300.000')
  })

  it('colors income green, expense in ink and transfer muted', () => {
    expect(amountClass('income')).toBe('text-success')
    expect(amountClass('expense')).toBe('text-ink')
    expect(amountClass('transfer')).toBe('text-muted')
  })
})

describe('sortTransactions', () => {
  const a = tx({ id: 1, date: '2026-10-01', amount: 500 })
  const b = tx({ id: 2, date: '2026-10-03', amount: 200 })
  const c = tx({ id: 3, date: '2026-10-03', amount: 900 })
  const d = tx({ id: 4, date: '2026-10-02', amount: 200 })
  const list = [a, b, c, d]
  const ids = (rows: Transaction[]) => rows.map((r) => r.id)

  it('sorts by date, newest id first within a day when descending', () => {
    expect(ids(sortTransactions(list, 'date', 'desc'))).toEqual([3, 2, 4, 1])
    expect(ids(sortTransactions(list, 'date', 'asc'))).toEqual([1, 4, 2, 3])
  })

  it('sorts by amount and breaks ties newest first', () => {
    expect(ids(sortTransactions(list, 'amount', 'desc'))).toEqual([3, 1, 2, 4])
    expect(ids(sortTransactions(list, 'amount', 'asc'))).toEqual([2, 4, 1, 3])
  })

  it('does not mutate the input', () => {
    sortTransactions(list, 'amount', 'asc')
    expect(ids(list)).toEqual([1, 2, 3, 4])
  })
})

describe('groupByDay', () => {
  it('groups by date and totals only the expenses of each day', () => {
    const groups = groupByDay([
      tx({ date: '2026-10-03', type: 'expense', amount: 78_000 }),
      tx({ date: '2026-10-03', type: 'income', amount: 1_250_000, categoryId: 20 }),
      tx({ date: '2026-10-03', type: 'expense', amount: 12_000 }),
      tx({ date: '2026-10-03', type: 'transfer', amount: 300_000, toAccountId: 2, categoryId: null }),
      tx({ date: '2026-10-01', type: 'expense', amount: 45_500 }),
    ])
    expect(groups.map((g) => g.label)).toEqual(['3 de octubre de 2026', '1 de octubre de 2026'])
    expect(groups.map((g) => formatMoney(g.spent))).toEqual(['$ 90.000', '$ 45.500'])
    expect(groups.map((g) => g.items.length)).toEqual([4, 1])
  })

  it('returns nothing for an empty list', () => {
    expect(groupByDay([])).toEqual([])
  })
})

describe('rowView', () => {
  it('shows the description, category, account and signed amount of an expense', () => {
    const view = rowView(tx({ description: 'Éxito', note: ' compra quincenal ', amount: 78_000 }), categoryMap, accountMap)
    expect(view).toMatchObject({
      title: 'Éxito',
      isFixed: false,
      note: 'compra quincenal',
      categoryName: 'Mercado',
      categoryColor: 'green',
      accountText: 'Nequi',
      amountText: '-$ 78.000',
      amountClass: 'text-ink',
      dateText: 'vie 2 oct',
    })
  })

  it('falls back to the category name and flags fixed-expense payments', () => {
    const view = rowView(tx({ categoryId: 11, fixedExpenseId: 5, fixedMonth: '2026-10' }), categoryMap, accountMap)
    expect(view.title).toBe('Arriendo')
    expect(view.isFixed).toBe(true)
  })

  it('reads a transfer as origin → destination with no category color', () => {
    const view = rowView(tx({ type: 'transfer', amount: 300_000, accountId: 2, toAccountId: 1, categoryId: null }), categoryMap, accountMap)
    expect(view).toMatchObject({
      title: 'Transferencia',
      categoryName: 'Transferencia',
      categoryColor: null,
      accountText: 'Bancolombia → Nequi',
      amountText: '$ 300.000',
      amountClass: 'text-muted',
    })
  })

  it('survives a category or account that is not loaded', () => {
    const view = rowView(tx({ categoryId: 99, accountId: 77 }), categoryMap, accountMap)
    expect(view.title).toBe('Sin categoría')
    expect(view.accountText).toBe('Cuenta eliminada')
  })
})

describe('bulk category rule', () => {
  const expense = tx({ type: 'expense' })
  const income = tx({ type: 'income', categoryId: 20 })
  const transfer = tx({ type: 'transfer', toAccountId: 2, categoryId: null })

  it('offers expense categories (not archived) for a selection of expenses', () => {
    expect(bulkCategoryRule([expense, expense])).toEqual({ kind: 'expense', reason: '' })
    expect(applicableCategories([expense], categories).map((c) => c.name)).toEqual(['Mercado', 'Arriendo'])
  })

  it('offers income categories for a selection of incomes', () => {
    expect(applicableCategories([income], categories).map((c) => c.name)).toEqual(['Salario'])
  })

  it('blocks a selection that mixes incomes and expenses', () => {
    const rule = bulkCategoryRule([expense, income])
    expect(rule.kind).toBeNull()
    expect(rule.reason).toBe('La selección mezcla ingresos y gastos: elige solo de un tipo.')
    expect(applicableCategories([expense, income], categories)).toEqual([])
  })

  it('blocks a selection with transfers', () => {
    const rule = bulkCategoryRule([expense, transfer])
    expect(rule.kind).toBeNull()
    expect(rule.reason).toBe('Las transferencias no llevan categoría: quítalas de la selección.')
  })

  it('has nothing to say without selection', () => {
    expect(bulkCategoryRule([])).toEqual({ kind: null, reason: '' })
  })
})

describe('deleteWarning', () => {
  it('asks plainly for a normal movement', () => {
    expect(deleteWarning([tx({})])).toEqual({ question: '¿Eliminar este movimiento? No se puede deshacer.', fixedNotice: '' })
  })

  it('warns that the fixed expense goes back to pending', () => {
    expect(deleteWarning([tx({ fixedExpenseId: 3 })]).fixedNotice).toBe('Es el pago de un gasto fijo: ese gasto fijo volverá a quedar pendiente en su mes.')
  })

  it('counts the selection and the fixed payments in it', () => {
    const warning = deleteWarning([tx({}), tx({ fixedExpenseId: 3 }), tx({ fixedExpenseId: 4 })])
    expect(warning.question).toBe('¿Eliminar 3 movimientos? No se puede deshacer.')
    expect(warning.fixedNotice).toBe('2 son pagos de gastos fijos: esos gastos fijos volverán a quedar pendientes en su mes.')
    expect(deleteWarning([tx({}), tx({ fixedExpenseId: 3 })]).fixedNotice).toBe('1 es el pago de un gasto fijo: ese gasto fijo volverá a quedar pendiente en su mes.')
  })
})

describe('removeEach / deleteResultText', () => {
  const failing = (bad: Record<number, unknown>) => (id: number) => (id in bad ? Promise.reject(bad[id]) : Promise.resolve())

  it('tells how many were deleted when all go through', async () => {
    expect(deleteResultText(await removeEach([1], failing({})))).toBe('Movimiento eliminado')
    expect(deleteResultText(await removeEach([1, 2, 3], failing({})))).toBe('3 movimientos eliminados')
  })

  it('keeps going after a failure and reports what was left', async () => {
    const calls: number[] = []
    const remove = (id: number) => {
      calls.push(id)
      return id === 2 ? Promise.reject(new Error('boom')) : Promise.resolve()
    }
    const result = await removeEach([1, 2, 3, 4], remove)
    expect(calls).toEqual([1, 2, 3, 4])
    expect(result).toEqual({ deleted: 3, failed: 1 })
    expect(deleteResultText(result)).toBe('Eliminados 3 de 4 movimientos. Faltó eliminar 1: intenta de nuevo.')
  })

  it('counts a movement that no longer exists (404) as deleted', async () => {
    expect(await removeEach([1, 2], failing({ 2: { status: 404 } }))).toEqual({ deleted: 2, failed: 0 })
  })

  it('throws the server error when nothing could be deleted', async () => {
    const down = new Error('No se pudo conectar')
    await expect(removeEach([1, 2], failing({ 1: down, 2: down }))).rejects.toBe(down)
  })
})

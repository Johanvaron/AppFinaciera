import type { BudgetRow, BudgetState, Category, CategoryGroup } from '@shared/contract'
import {
  barRatio,
  budgetedSpent,
  spentDetail,
  groupRows,
  groupSubtotalText,
  groupUncappedText,
  hasAnyBudget,
  isOver,
  neighborId,
  overallRatio,
  ratioState,
  resolveBudgetEdit,
  stateTone,
  statusText,
} from './budget'

let nextId = 1
function row(name: string, group: CategoryGroup, budget: number | null, spent: number, extra: Partial<Category> = {}): BudgetRow {
  const ratio = budget ? spent / budget : null
  const state: BudgetState = budget == null ? 'none' : spent > budget ? 'over' : ratio != null && ratio >= 0.8 ? 'warning' : 'ok'
  return {
    category: { id: nextId++, name, kind: 'expense', group, color: 'blue', archived: false, ...extra },
    budget,
    spent,
    remaining: budget == null ? null : budget - spent,
    ratio,
    state,
  }
}
const names = (rows: BudgetRow[]) => rows.map((r) => r.category.name)

describe('status text of a row', () => {
  it('says how much is left', () => {
    expect(statusText({ budget: 500000, spent: 380000 })).toBe('Te quedan $ 120.000')
  })
  it('says by how much it went over', () => {
    expect(statusText({ budget: 300000, spent: 335000 })).toBe('Te pasaste por $ 35.000')
    expect(isOver({ budget: 300000, spent: 335000 })).toBe(true)
  })
  it('says when it is exactly on the cap', () => {
    expect(statusText({ budget: 250000, spent: 250000 })).toBe('Justo en el tope')
    expect(isOver({ budget: 250000, spent: 250000 })).toBe(false)
  })
  it('says when there is no cap, whatever was spent', () => {
    expect(statusText({ budget: null, spent: 90000 })).toBe('Sin tope')
    expect(isOver({ budget: null, spent: 90000 })).toBe(false)
  })
  it('treats a cap of zero with spending as exceeded', () => {
    expect(statusText({ budget: 0, spent: 42000 })).toBe('Te pasaste por $ 42.000')
  })
})

describe('tone by state', () => {
  it('maps each state to its color', () => {
    expect(stateTone('ok')).toBe('success')
    expect(stateTone('warning')).toBe('warning')
    expect(stateTone('over')).toBe('danger')
    expect(stateTone('none')).toBe('neutral')
  })
  it('uses the server thresholds for the overall bar', () => {
    expect(ratioState(0.79)).toBe('ok')
    expect(ratioState(0.8)).toBe('warning')
    expect(ratioState(1)).toBe('warning')
    expect(ratioState(1.01)).toBe('over')
    expect(ratioState(null)).toBe('none')
  })
  it('measures the overall bar with the capped spending only, like "Disponible"', () => {
    // 900.000 spent in the month, but only 500.000 of it in capped categories.
    const totals = { budget: 2000000, spent: 900000, remaining: 1500000 }
    expect(budgetedSpent(totals)).toBe(500000)
    expect(overallRatio(totals)).toBe(0.25)
    expect(spentDetail(totals)).toBe('$ 500.000 en categorías con tope')
    expect(overallRatio({ budget: 0, spent: 500000, remaining: 0 })).toBeNull()
  })
  it('adds no detail when all the spending is capped', () => {
    expect(spentDetail({ budget: 2000000, spent: 500000, remaining: 1500000 })).toBeUndefined()
  })
  it('fills the bar of a zero cap with spending', () => {
    expect(barRatio({ ratio: 0.4, state: 'ok' })).toBe(0.4)
    expect(barRatio({ ratio: null, state: 'over' })).toBe(1)
    expect(barRatio({ ratio: null, state: 'none' })).toBeNull()
  })
})

describe('grouping and order', () => {
  const rows = [
    row('Zapatos', 'variables', null, 0),
    row('Mercado', 'variables', 800000, 400000),
    row('Antojos', 'variables', null, 60000),
    row('Restaurantes', 'variables', 200000, 260000),
    row('Arriendo', 'fijos', 1200000, 1200000),
    row('Transporte', 'variables', 150000, 135000),
    row('Regalos', 'variables', null, 95000),
    row('Aseo', 'variables', null, 0),
    row('Salario', 'ingresos', null, 0),
  ]

  it('lists fixed, variable and savings groups first, skipping empty ones', () => {
    expect(groupRows(rows).map((g) => g.label)).toEqual(['Gastos fijos', 'Gastos variables', 'Ingresos'])
    expect(groupRows(rows.slice(0, 8)).map((g) => g.label)).toEqual(['Gastos fijos', 'Gastos variables'])
    expect(groupRows([...rows, row('Fondo', 'ahorro', null, 0)]).map((g) => g.label)).toEqual(['Gastos fijos', 'Gastos variables', 'Ahorro', 'Ingresos'])
  })

  it('never drops a row: an expense category in the income group keeps its cap on the list', () => {
    const all = [...rows, row('Rara', 'ingresos', 300000, 120000)]
    const groups = groupRows(all)
    const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)
    expect(groups.flatMap((g) => names(g.rows)).sort()).toEqual(names(all).sort())
    expect(sum(groups.map((g) => g.budget))).toBe(sum(all.map((r) => r.budget ?? 0)))
    expect(sum(groups.map((g) => g.budget))).toBe(2650000)
    expect(sum(groups.map((g) => g.spent))).toBe(sum(all.map((r) => r.spent)))
    const ingresos = groups.find((g) => g.group === 'ingresos')!
    expect(names(ingresos.rows)).toEqual(['Rara', 'Salario'])
    expect(groupSubtotalText(ingresos)).toBe('$ 120.000 de $ 300.000')
  })

  it('puts capped rows first by ratio, then uncapped by spending, then the rest by name', () => {
    const variables = groupRows(rows).find((g) => g.group === 'variables')!
    expect(names(variables.rows)).toEqual(['Restaurantes', 'Transporte', 'Mercado', 'Regalos', 'Antojos', 'Aseo', 'Zapatos'])
  })

  it('puts a zero cap with spending above everything', () => {
    const group = groupRows([row('Mercado', 'variables', 100000, 150000), row('Apuestas', 'variables', 0, 5000)])[0]!
    expect(names(group.rows)).toEqual(['Apuestas', 'Mercado'])
  })

  it('adds up budget and spent per group', () => {
    const variables = groupRows(rows).find((g) => g.group === 'variables')!
    expect(variables.budget).toBe(1150000)
    expect(variables.spent).toBe(950000)
    expect(variables.cappedSpent).toBe(795000)
  })

  it('compares only the capped spending against the caps of the group', () => {
    const variables = groupRows(rows).find((g) => g.group === 'variables')!
    expect(groupSubtotalText(variables)).toBe('$ 795.000 de $ 1.150.000')
    expect(groupUncappedText(variables)).toBe('+ $ 155.000 sin tope')
    const fijos = groupRows(rows).find((g) => g.group === 'fijos')!
    expect(groupSubtotalText(fijos)).toBe('$ 1.200.000 de $ 1.200.000')
    expect(groupUncappedText(fijos)).toBeUndefined()
  })

  it('shows only the spending when the group has no caps', () => {
    const group = groupRows([row('Antojos', 'variables', null, 60000), row('Regalos', 'variables', null, 95000)])[0]!
    expect(groupSubtotalText(group)).toBe('$ 155.000 gastado')
    expect(groupUncappedText(group)).toBeUndefined()
    expect(hasAnyBudget(group.rows)).toBe(false)
  })

  it('keeps a frozen order while caps are being filled', () => {
    const a = row('Mercado', 'variables', null, 0)
    const b = row('Antojos', 'variables', 100000, 150000)
    const frozen = [a.category.id, b.category.id]
    expect(names(groupRows([b, a], frozen)[0]!.rows)).toEqual(['Mercado', 'Antojos'])
    expect(names(groupRows([b, a])[0]!.rows)).toEqual(['Antojos', 'Mercado'])
  })
})

describe('what gets saved when a cap is edited', () => {
  const month = '2026-10'
  it('sends the typed number', () => {
    expect(resolveBudgetEdit(null, '500.000', 7, month)).toEqual({ kind: 'save', input: { categoryId: 7, month, amount: 500000 } })
  })
  it('accepts "500k" and "1,5m"', () => {
    expect(resolveBudgetEdit(300000, '500k', 7, month)).toEqual({ kind: 'save', input: { categoryId: 7, month, amount: 500000 } })
    expect(resolveBudgetEdit(300000, '1,5m', 7, month)).toEqual({ kind: 'save', input: { categoryId: 7, month, amount: 1500000 } })
  })
  it('sends null when the field is emptied', () => {
    expect(resolveBudgetEdit(300000, '  ', 7, month)).toEqual({ kind: 'save', input: { categoryId: 7, month, amount: null } })
  })
  it('does not call when nothing changed', () => {
    expect(resolveBudgetEdit(300000, '300.000', 7, month)).toEqual({ kind: 'noop' })
    expect(resolveBudgetEdit(300000, '300k', 7, month)).toEqual({ kind: 'noop' })
    expect(resolveBudgetEdit(null, '', 7, month)).toEqual({ kind: 'noop' })
  })
  it('never reads garbage as "remove the cap"', () => {
    expect(resolveBudgetEdit(300000, 'abc', 7, month)).toEqual({ kind: 'invalid' })
    expect(resolveBudgetEdit(300000, '-5', 7, month)).toEqual({ kind: 'invalid' })
    expect(resolveBudgetEdit(300000, '9999999999999', 7, month)).toEqual({ kind: 'invalid' })
  })
  it('can set an explicit cap of zero', () => {
    expect(resolveBudgetEdit(null, '0', 7, month)).toEqual({ kind: 'save', input: { categoryId: 7, month, amount: 0 } })
  })
})

describe('Tab between caps', () => {
  it('walks the order on screen and stops at the ends', () => {
    expect(neighborId([4, 9, 2], 9, 1)).toBe(2)
    expect(neighborId([4, 9, 2], 9, -1)).toBe(4)
    expect(neighborId([4, 9, 2], 2, 1)).toBeNull()
    expect(neighborId([4, 9, 2], 4, -1)).toBeNull()
  })
})

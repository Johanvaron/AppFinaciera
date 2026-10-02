import { mount } from '@vue/test-utils'
import type { BudgetMonthResponse, BudgetRow } from '@shared/contract'
import BudgetSummary from './BudgetSummary.vue'

function row(id: number, budget: number | null, spent: number): BudgetRow {
  return {
    category: { id, name: `Categoría ${id}`, kind: 'expense', group: 'variables', color: 'blue', archived: false },
    budget,
    spent,
    remaining: budget == null ? null : budget - spent,
    ratio: budget ? spent / budget : null,
    state: budget == null ? 'none' : spent > budget ? 'over' : 'ok',
  }
}

function mountSummary(data: BudgetMonthResponse) {
  const wrapper = mount(BudgetSummary, { props: { data } })
  /** Text of the card that carries this label, so each figure is tied to its name. */
  const card = (label: string) => {
    const found = wrapper.findAll('.rounded-card').find((box) => box.text().includes(label))
    if (!found) throw new Error(`No card labeled "${label}"`)
    return found.text()
  }
  return { wrapper, card }
}

describe('BudgetSummary', () => {
  it('shows each figure of the month next to its label', () => {
    // 900.000 spent in the month, 500.000 of it in the capped category.
    const { wrapper, card } = mountSummary({
      month: '2026-10',
      rows: [row(1, 2000000, 500000), row(2, null, 400000)],
      totals: { budget: 2000000, spent: 900000, remaining: 1500000 },
    })
    expect(card('Presupuestado')).toBe('Presupuestado$ 2.000.000')
    expect(card('Gastado en el mes')).toBe('Gastado en el mes$ 900.000$ 500.000 con tope')
    expect(card('Disponible')).toBe('Disponible$ 1.500.000')
    expect(card('Uso del presupuesto')).toBe('Uso del presupuesto25 %')
    expect(wrapper.text()).not.toContain('Te pasaste por')
  })

  it('says by how much the budget was exceeded, without a minus sign', () => {
    const { wrapper, card } = mountSummary({
      month: '2026-10',
      rows: [row(1, 300000, 335000)],
      totals: { budget: 300000, spent: 335000, remaining: -35000 },
    })
    expect(card('Te pasaste por')).toBe('Te pasaste por$ 35.000')
    expect(card('Presupuestado')).toBe('Presupuestado$ 300.000')
    expect(card('Gastado en el mes')).toBe('Gastado en el mes$ 335.000')
    expect(card('Uso del presupuesto')).toBe('Uso del presupuesto112 %')
    expect(wrapper.text()).not.toContain('Disponible')
  })

  it('shows only what was spent while no category has a cap', () => {
    const { wrapper } = mountSummary({
      month: '2026-10',
      rows: [row(1, null, 500000), row(2, null, 400000)],
      totals: { budget: 0, spent: 900000, remaining: 0 },
    })
    expect(wrapper.text()).toContain('Este mes llevas gastado $ 900.000. Toca "Poner tope" en una categoría para empezar.')
    expect(wrapper.text()).not.toContain('Presupuestado')
    expect(wrapper.text()).not.toContain('Disponible')
  })
})

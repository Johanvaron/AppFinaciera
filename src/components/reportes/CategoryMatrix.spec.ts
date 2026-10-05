import { mount } from '@vue/test-utils'
import type { CategoryReport } from '@shared/contract'
import CategoryMatrix from './CategoryMatrix.vue'

const report: CategoryReport = {
  months: ['2026-09', '2026-10'],
  rows: [
    {
      category: { id: 7, name: 'Mercado', kind: 'expense', group: 'variables', color: 'blue', archived: false },
      totals: [600_000, 750_000],
      total: 1_350_000,
      average: 675_000,
    },
  ],
}

const mountMatrix = (stale: boolean) =>
  mount(CategoryMatrix, { props: { report, loading: false, stale, error: null, kind: 'income', selectedId: null } })

describe('CategoryMatrix', () => {
  it('opens the trend of a category when its row is clicked', async () => {
    const wrapper = mountMatrix(false)
    expect(wrapper.find('.table-wrap').attributes('aria-busy')).toBe('false')
    await wrapper.find('tbody tr').trigger('click')
    expect(wrapper.emitted('update:selectedId')).toEqual([[7]])
  })

  it('marks the previous report as busy and ignores clicks while the new one loads', async () => {
    // The title already says "Ingreso" but the rows are still the expenses of the previous request.
    const wrapper = mountMatrix(true)
    expect(wrapper.find('h2').text()).toBe('Ingreso por categoría')
    expect(wrapper.find('.table-wrap').attributes('aria-busy')).toBe('true')
    expect(wrapper.find('.table-wrap').classes()).toContain('opacity-50')
    expect(wrapper.find('tbody button').attributes('disabled')).toBeDefined()
    await wrapper.find('tbody tr').trigger('click')
    expect(wrapper.emitted('update:selectedId')).toBeUndefined()
  })

  it('says it is loading, not that the range is empty, while an empty previous report is stale', () => {
    // "Gastos" was just pressed over an income report with no rows: nothing is known about the expenses yet.
    const props = { report: { months: report.months, rows: [] }, loading: false, error: null, kind: 'expense' as const, selectedId: null }
    const wrapper = mount(CategoryMatrix, { props: { ...props, stale: true } })
    expect(wrapper.find('p.text-center').text()).toBe('Cargando categorías…')
    expect(wrapper.text()).not.toContain('No hay gastos en este rango.')
    // Once the answer is in and it is still empty, the empty message is true.
    expect(mount(CategoryMatrix, { props: { ...props, stale: false } }).find('p.text-center').text()).toBe('No hay gastos en este rango.')
  })
})

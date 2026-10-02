import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { BudgetRow } from '@shared/contract'
import { api } from '@/lib/api'
import { usePeriodStore } from '@/stores/period'
import BudgetList from './BudgetList.vue'

vi.mock('@/lib/api', async (original) => ({
  ...(await original<typeof import('@/lib/api')>()),
  api: { budgets: { set: vi.fn(() => Promise.resolve({ month: '2026-10', rows: [], totals: { budget: 0, spent: 0, remaining: 0 } })) } },
}))

const rows: BudgetRow[] = [
  { category: { id: 3, name: 'Mercado', kind: 'expense', group: 'variables', color: 'green', archived: false }, budget: 500000, spent: 380000, remaining: 120000, ratio: 0.76, state: 'ok' },
  { category: { id: 5, name: 'Antojos', kind: 'expense', group: 'variables', color: 'rose', archived: true }, budget: null, spent: 64000, remaining: null, ratio: null, state: 'none' },
]

function mountList() {
  const pinia = createPinia()
  setActivePinia(pinia)
  usePeriodStore().month = '2026-10'
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/:all(.*)*', component: { template: '<div />' } }] })
  return mount(BudgetList, { props: { rows }, global: { plugins: [pinia, router, VueQueryPlugin] }, attachTo: document.body })
}

const trigger = (wrapper: ReturnType<typeof mountList>, id: number) => wrapper.get(`[data-budget-trigger="${id}"]`)

describe('BudgetList', () => {
  beforeEach(() => vi.mocked(api.budgets.set).mockClear())

  it('shows each row as the person reads it', () => {
    const text = mountList().text()
    expect(text).toContain('Gastos variables')
    expect(text).toContain('$ 380.000 de $ 500.000')
    expect(text).toContain('+ $ 64.000 sin tope')
    expect(text).toContain('Te quedan $ 120.000')
    expect(text).toContain('76 %')
    expect(text).toContain('Sin tope')
    expect(text).toContain('archivada')
    expect(text).toContain('$ 64.000')
  })

  it('saves a typed cap with Enter', async () => {
    const wrapper = mountList()
    expect(trigger(wrapper, 5).text()).toBe('Poner tope')
    await trigger(wrapper, 5).trigger('click')
    const input = wrapper.get('input')
    expect(input.attributes('aria-label')).toBe('Tope de Antojos')
    await input.setValue('200k')
    await input.trigger('keydown', { key: 'Enter' })
    expect(api.budgets.set).toHaveBeenCalledTimes(1)
    expect(api.budgets.set).toHaveBeenCalledWith({ categoryId: 5, month: '2026-10', amount: 200000 })
    expect(wrapper.find('input').exists()).toBe(false)
    expect(trigger(wrapper, 5).text()).toBe('$ 200.000')
    await flushPromises()
  })

  it('removes the cap when the field is emptied, and Tab moves to the next row', async () => {
    const wrapper = mountList()
    await trigger(wrapper, 3).trigger('click')
    const input = wrapper.get('input')
    expect((input.element as HTMLInputElement).value).toBe('500.000')
    await input.setValue('')
    await input.trigger('keydown', { key: 'Tab' })
    expect(api.budgets.set).toHaveBeenCalledWith({ categoryId: 3, month: '2026-10', amount: null })
    // Antojos is now the row being edited.
    expect(wrapper.find('[data-budget-trigger="5"]').exists()).toBe(false)
    expect(wrapper.findAll('input')).toHaveLength(1)
    await flushPromises()
  })

  it('reopens a cap that is still saving with the value on screen, and can put the old one back', async () => {
    let finish = () => {}
    vi.mocked(api.budgets.set).mockImplementationOnce(() => new Promise((resolve) => (finish = () => resolve({ month: '2026-10', rows: [], totals: { budget: 0, spent: 0, remaining: 0 } }))))
    const wrapper = mountList()
    await trigger(wrapper, 3).trigger('click')
    await wrapper.get('input').setValue('900k')
    await wrapper.get('input').trigger('keydown', { key: 'Enter' })
    expect(trigger(wrapper, 3).text()).toBe('$ 900.000')

    await trigger(wrapper, 3).trigger('click')
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('900.000')
    await wrapper.get('input').trigger('keydown', { key: 'Enter' })
    expect(api.budgets.set).toHaveBeenCalledTimes(1)

    await trigger(wrapper, 3).trigger('click')
    await wrapper.get('input').setValue('500.000')
    await wrapper.get('input').trigger('keydown', { key: 'Enter' })
    expect(api.budgets.set).toHaveBeenCalledTimes(2)
    expect(api.budgets.set).toHaveBeenLastCalledWith({ categoryId: 3, month: '2026-10', amount: 500000 })
    finish()
    await flushPromises()
  })

  it('does not call the API on Esc, on an unchanged value or on garbage', async () => {
    const wrapper = mountList()
    await trigger(wrapper, 3).trigger('click')
    await wrapper.get('input').setValue('900k')
    await wrapper.get('input').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('input').exists()).toBe(false)

    await trigger(wrapper, 3).trigger('click')
    await wrapper.get('input').trigger('focusout')
    expect(wrapper.find('input').exists()).toBe(false)

    await trigger(wrapper, 3).trigger('click')
    await wrapper.get('input').setValue('abc')
    await wrapper.get('input').trigger('keydown', { key: 'Enter' })
    expect(wrapper.get('input').attributes('aria-invalid')).toBe('true')
    expect(api.budgets.set).not.toHaveBeenCalled()
  })
})

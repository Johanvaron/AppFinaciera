import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import type { Transaction } from '@shared/contract'
import { api } from '@/lib/api'
import { usePeriodStore } from '@/stores/period'
import MovimientosView from '@/views/MovimientosView.vue'

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    api: {
      accounts: { list: vi.fn() },
      categories: { list: vi.fn() },
      transactions: { list: vi.fn(), remove: vi.fn(), bulkCategorize: vi.fn() },
    },
  }
})

const GROCERIES: Transaction = {
  id: 31,
  date: '2026-10-02',
  amount: 78_000,
  type: 'expense',
  accountId: 3,
  toAccountId: null,
  categoryId: 7,
  description: 'Mercado de la semana',
  note: '',
  fixedExpenseId: null,
  fixedMonth: null,
  createdAt: '2026-10-02T12:00:00',
}

const dialog = () => document.querySelector('[role="dialog"]')

describe('MovimientosView: changing the month', () => {
  it('closes the delete confirmation, so rows of the previous month cannot be deleted', async () => {
    sessionStorage.clear()
    vi.mocked(api.accounts.list).mockResolvedValue([{ id: 3, name: 'Nequi', type: 'billetera', initialBalance: 0, archived: false, balance: 0 }])
    vi.mocked(api.categories.list).mockResolvedValue([{ id: 7, name: 'Mercado', kind: 'expense', group: 'variables', color: 'green', archived: false }])
    vi.mocked(api.transactions.list).mockResolvedValue([GROCERIES])

    const pinia = createPinia()
    setActivePinia(pinia)
    const period = usePeriodStore()
    period.month = '2026-10'
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = mount(MovimientosView, { global: { plugins: [pinia, [VueQueryPlugin, { queryClient }]] }, attachTo: document.body })
    await flushPromises()

    await wrapper.get('button[aria-label="Eliminar Mercado de la semana"]').trigger('click')
    expect(dialog()?.textContent).toContain('¿Eliminar este movimiento? No se puede deshacer.')

    period.next()
    await flushPromises()
    expect(dialog()).toBeNull()

    wrapper.unmount()
  })
})

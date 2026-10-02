import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { nextTick } from 'vue'
import type { Account, Category, FixedMonthItem, FixedMonthResponse } from '@shared/contract'
import { api } from '@/lib/api'
import '@/lib/zod-locale'
import FijosView from '@/views/FijosView.vue'
import { fixedItem } from './fixtures'

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    api: {
      accounts: { list: vi.fn() },
      categories: { list: vi.fn() },
      fixed: { month: vi.fn(), override: vi.fn(), pay: vi.fn(), unpay: vi.fn() },
    },
  }
})

const ACCOUNTS: Account[] = [{ id: 3, name: 'Nequi', type: 'billetera', initialBalance: 0, archived: false, balance: 0 }]
const CATEGORIES: Category[] = [{ id: 3, name: 'Transporte', kind: 'expense', group: 'fijos', color: 'blue', archived: false }]

function monthOf(items: FixedMonthItem[]): FixedMonthResponse {
  const pending = items.reduce((total, item) => total + Math.max(item.expectedAmount - item.paidAmount, 0), 0)
  const paid = items.reduce((total, item) => total + item.paidAmount, 0)
  return { month: '2026-10', items, totals: { expected: paid + pending, paid, pending, countPaid: 0, countTotal: items.length } }
}

const button = (label: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === label || b.getAttribute('aria-label') === label)
const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]')
const dialogAmount = () => dialog()?.querySelector<HTMLInputElement>('input[inputmode="decimal"]')

describe('FijosView', () => {
  let wrapper: VueWrapper

  async function mountWith(items: FixedMonthItem[]) {
    vi.mocked(api.fixed.month).mockResolvedValue(monthOf(items))
    wrapper = mount(FijosView, {
      attachTo: document.body,
      global: { plugins: [createPinia(), [VueQueryPlugin, { queryClient: new QueryClient() }]], stubs: { MonthSwitcher: true } },
    })
    await vi.waitFor(() => expect(wrapper.find('li').exists()).toBe(true))
  }

  beforeEach(() => {
    vi.mocked(api.accounts.list).mockResolvedValue(ACCOUNTS)
    vi.mocked(api.categories.list).mockResolvedValue(CATEGORIES)
    vi.mocked(api.fixed.override).mockReset()
    vi.mocked(api.fixed.unpay).mockReset()
  })

  afterEach(() => wrapper.unmount())

  it('pays the amount typed in the row when the check is clicked right after typing it', async () => {
    const moto = fixedItem({ expectedAmount: 600_000 })
    const edited = { ...moto, expectedAmount: 650_000, hasOverride: true }
    await mountWith([moto])
    vi.mocked(api.fixed.override).mockImplementation(async () => {
      vi.mocked(api.fixed.month).mockResolvedValue(monthOf([edited]))
      return edited
    })

    button('Cambiar el monto de Moto este mes, ahora $ 600.000')!.click()
    await nextTick()
    const inline = wrapper.find<HTMLInputElement>('li input')
    await inline.setValue('650000')
    // No Enter: the click on the check blurs the field, which saves, and opens the dialog.
    await inline.trigger('focusout')
    button('Marcar Moto como pagado')!.click()

    await vi.waitFor(() => expect(dialogAmount()?.value).toBe('650.000'))
    expect(vi.mocked(api.fixed.override).mock.calls).toEqual([[1, '2026-10', { expectedAmount: 650_000 }]])
  })

  it('says under both totals how many rows are not counted because they have no amount yet', async () => {
    const card = (id: number, name: string) => fixedItem({ variableAmount: true, expectedAmount: 0, fixed: { ...fixedItem().fixed, id, name, amount: 0, variableAmount: true } })
    await mountWith([fixedItem({ expectedAmount: 1_578_416 }), card(2, 'BBVA 1'), card(3, 'BBVA 2')])
    const cards = wrapper.findAll('.stat-card').map((c) => c.text())
    expect(cards[0]).toBe('Total del mes$ 1.578.416Sin contar 2 con monto por definir')
    expect(cards[2]).toBe('Falta por pagar$ 1.578.416Sin contar 2 con monto por definir')
    expect(cards[1]).toBe('Pagado$ 0')
  })

  it('opens the "delete the payment" confirmation with the focus on Cancelar, so a held Enter deletes nothing', async () => {
    await mountWith([fixedItem({ status: 'paid', paidAmount: 587_250, paidDate: '2026-10-02', transactionIds: [41] })])
    button('Desmarcar Moto como pagado')!.click()
    await vi.waitFor(() => expect(dialog()).not.toBeNull())
    await nextTick()
    expect(dialog()!.textContent).toContain('Se borra el pago de $ 587.250 y vuelve a quedar pendiente.')
    expect(document.activeElement?.textContent?.trim()).toBe('Cancelar')
  })

  it('deletes the partial payments of an unpaid row from its menu', async () => {
    const rappi = fixedItem({ expectedAmount: 1_143_416, paidAmount: 500_000, transactionIds: [41] })
    vi.mocked(api.fixed.unpay).mockResolvedValue({ ...rappi, paidAmount: 0, transactionIds: [] })
    await mountWith([rappi])
    expect(wrapper.find('li').text()).toContain('Abonado $ 500.000 de $ 1.143.416')
    expect(wrapper.find('li').text()).toContain('$ 643.416')

    button('Acciones de Moto')!.click()
    await nextTick()
    button('Borrar abonos')!.click()
    await nextTick()
    expect(dialog()!.getAttribute('aria-label')).toBe('Borrar abonos de Moto')
    expect(dialog()!.textContent).toContain('Se borra el pago de $ 500.000 y vuelve a faltar todo: $ 1.143.416.')

    button('Borrar el pago')!.click()
    await vi.waitFor(() => expect(api.fixed.unpay).toHaveBeenCalledWith(1, '2026-10'))
  })
})

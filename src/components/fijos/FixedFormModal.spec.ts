import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { nextTick } from 'vue'
import type { Category, FixedExpense } from '@shared/contract'
import { api } from '@/lib/api'
import '@/lib/zod-locale'
import FixedFormModal from './FixedFormModal.vue'
import { fixedItem } from './fixtures'

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    api: {
      accounts: { list: vi.fn() },
      categories: { list: vi.fn() },
      fixed: { create: vi.fn(), update: vi.fn() },
    },
  }
})

const CATEGORIES: Category[] = [{ id: 3, name: 'Tarjetas', kind: 'expense', group: 'fijos', color: 'blue', archived: false }]
/** A credit card: the amount changes every month, with $ 400.000 as the usual figure. */
const CARD: FixedExpense = { ...fixedItem().fixed, id: 7, name: 'Rappi', amount: 400_000, variableAmount: true }

const amountInput = () => document.querySelector<HTMLInputElement>('[role="dialog"] input[inputmode="decimal"]')!
const alerts = () => [...document.querySelectorAll('[role="dialog"] [role="alert"]')].map((el) => el.textContent?.trim())

async function type(text: string) {
  amountInput().value = text
  amountInput().dispatchEvent(new Event('input', { bubbles: true }))
  await nextTick()
}
async function submitForm() {
  document.querySelector('#fixed-expense-form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  await nextTick()
}

describe('FixedFormModal: the amount field', () => {
  let wrapper: VueWrapper

  async function openWith(editing: FixedExpense | null) {
    wrapper = mount(FixedFormModal, {
      attachTo: document.body,
      props: { open: false, editing, month: '2026-10' },
      global: { plugins: [createPinia(), [VueQueryPlugin, { queryClient: new QueryClient() }]] },
    })
    await wrapper.setProps({ open: true })
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"] option[value="3"]')).not.toBeNull())
  }

  beforeEach(() => {
    vi.mocked(api.accounts.list).mockResolvedValue([])
    vi.mocked(api.categories.list).mockResolvedValue(CATEGORIES)
    vi.mocked(api.fixed.create).mockReset().mockResolvedValue(CARD)
    vi.mocked(api.fixed.update).mockReset().mockResolvedValue(CARD)
  })

  afterEach(() => wrapper.unmount())

  it('does not save a mistyped amount as 0 over the one it had', async () => {
    await openWith(CARD)
    expect(amountInput().value).toBe('400.000')
    await type('40o000')
    await submitForm()
    expect(alerts()).toEqual(['Eso no es un monto. Escribe solo el número, por ejemplo 400000 o 400k'])
    expect(api.fixed.update).not.toHaveBeenCalled()
  })

  it('rejects text that is not a number', async () => {
    await openWith(CARD)
    await type('abc')
    await submitForm()
    expect(alerts()).toEqual(['Eso no es un monto. Escribe solo el número, por ejemplo 400000 o 400k'])
    expect(api.fixed.update).not.toHaveBeenCalled()
  })

  it('saves 0 when the optional amount of a variable expense is left empty', async () => {
    await openWith(CARD)
    await type('')
    await submitForm()
    await vi.waitFor(() => expect(api.fixed.update).toHaveBeenCalled())
    expect(vi.mocked(api.fixed.update).mock.calls[0]).toEqual([7, expect.objectContaining({ amount: 0, variableAmount: true })])
  })

  it('saves the amount that was typed', async () => {
    await openWith(CARD)
    await type('450k')
    await submitForm()
    await vi.waitFor(() => expect(api.fixed.update).toHaveBeenCalled())
    expect(vi.mocked(api.fixed.update).mock.calls[0]).toEqual([7, expect.objectContaining({ amount: 450_000 })])
  })

  it('asks for the amount of an expense that is the same every month', async () => {
    await openWith({ ...CARD, variableAmount: false })
    await type('')
    await submitForm()
    expect(alerts()).toEqual(['Pon el monto mensual, o marca que cambia cada mes'])
    expect(api.fixed.update).not.toHaveBeenCalled()
  })
})

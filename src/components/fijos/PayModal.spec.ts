import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import type { Account, FixedMonthItem } from '@shared/contract'
import { api } from '@/lib/api'
import '@/lib/zod-locale'
import { fixedItem } from './fixtures'
import PayModal from './PayModal.vue'

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return { ...actual, api: { accounts: { list: vi.fn() }, fixed: { pay: vi.fn() } } }
})

const ACCOUNTS: Account[] = [{ id: 3, name: 'Nequi', type: 'billetera', initialBalance: 0, archived: false, balance: 0 }]

const amountInput = () => document.querySelector<HTMLInputElement>('[role="dialog"] input[inputmode="decimal"]')

describe('PayModal', () => {
  let wrapper: VueWrapper

  async function openWith(item: FixedMonthItem) {
    wrapper = mount(PayModal, {
      attachTo: document.body,
      props: { open: false, item },
      global: { plugins: [createPinia(), [VueQueryPlugin, { queryClient: new QueryClient() }]] },
    })
    await wrapper.setProps({ open: true })
    await vi.waitFor(() => expect(amountInput()).not.toBeNull())
  }

  beforeEach(() => {
    vi.mocked(api.accounts.list).mockResolvedValue(ACCOUNTS)
    vi.mocked(api.fixed.pay).mockReset()
  })

  afterEach(() => wrapper.unmount())

  it('offers the whole amount of a row without payments', async () => {
    await openWith(fixedItem({ expectedAmount: 514_381 }))
    expect(amountInput()!.value).toBe('514.381')
  })

  it('offers only what is still owed after a partial payment', async () => {
    await openWith(fixedItem({ expectedAmount: 1_143_416, paidAmount: 500_000, transactionIds: [41] }))
    expect(amountInput()!.value).toBe('643.416')
  })

  it('follows an amount that changes under the open dialog', async () => {
    const moto = fixedItem({ expectedAmount: 600_000 })
    await openWith(moto)
    expect(amountInput()!.value).toBe('600.000')
    await wrapper.setProps({ item: { ...moto, expectedAmount: 650_000, hasOverride: true } })
    expect(amountInput()!.value).toBe('650.000')
  })

  it('keeps what the person typed when the row changes', async () => {
    const moto = fixedItem({ expectedAmount: 600_000 })
    await openWith(moto)
    amountInput()!.value = '200k'
    amountInput()!.dispatchEvent(new Event('input', { bubbles: true }))
    await wrapper.setProps({ item: { ...moto, expectedAmount: 650_000, hasOverride: true } })
    expect(amountInput()!.value).toBe('200k')
  })

  it('pays what is still owed when confirming with Enter', async () => {
    const rappi = fixedItem({ expectedAmount: 1_143_416, paidAmount: 500_000, transactionIds: [41] })
    vi.mocked(api.fixed.pay).mockResolvedValue({ ...rappi, status: 'paid', paidAmount: 1_143_416 })
    await openWith(rappi)
    document.querySelector('#fixed-pay-form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await vi.waitFor(() => expect(api.fixed.pay).toHaveBeenCalled())
    expect(vi.mocked(api.fixed.pay).mock.calls[0]).toEqual([1, expect.objectContaining({ month: '2026-10', amount: 643_416, accountId: 3 })])
  })
})

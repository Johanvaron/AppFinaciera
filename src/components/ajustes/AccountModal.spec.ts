import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { nextTick } from 'vue'
import type { Account } from '@shared/contract'
import { api } from '@/lib/api'
import '@/lib/zod-locale'
import AccountModal from './AccountModal.vue'

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return { ...actual, api: { accounts: { create: vi.fn(), update: vi.fn() } } }
})

const RAPPI: Account = { id: 6, name: 'Tarjeta Rappi', type: 'tarjeta', initialBalance: -1_143_416, archived: false, balance: -1_310_000 }

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!
const amountInput = () => $<HTMLInputElement>('[role="dialog"] input[inputmode="decimal"]')
const nameInput = () => $<HTMLInputElement>('[role="dialog"] input[maxlength="60"]')
const debtCheckbox = () => $<HTMLInputElement>('[role="dialog"] input[type="checkbox"]')
const alerts = () => [...document.querySelectorAll('[role="dialog"] [role="alert"]')].map((el) => el.textContent?.trim())

async function type(input: HTMLInputElement, text: string) {
  input.value = text
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await nextTick()
}
async function submitForm() {
  $('#account-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  await nextTick()
}

describe('AccountModal: initial balance', () => {
  let wrapper: VueWrapper

  async function openWith(account: Account | null) {
    wrapper = mount(AccountModal, {
      props: { open: true, account },
      attachTo: document.body,
      global: { plugins: [createPinia(), VueQueryPlugin] },
    })
    await nextTick()
  }

  beforeEach(() => {
    vi.mocked(api.accounts.create).mockReset().mockResolvedValue({ ...RAPPI, id: 9 })
    vi.mocked(api.accounts.update).mockReset().mockResolvedValue(RAPPI)
  })

  afterEach(() => wrapper.unmount())

  it('shows a stored debt as a positive amount with the checkbox on', async () => {
    await openWith(RAPPI)
    expect(amountInput().value).toBe('1.143.416')
    expect(debtCheckbox().checked).toBe(true)
  })

  it.each(['-1.200.000', '350.000 pesos', 'abc'])('rejects "%s" and sends nothing', async (text) => {
    await openWith(RAPPI)
    await type(amountInput(), text)
    await submitForm()
    expect(alerts()).toEqual(['Escribe un monto válido'])
    expect(api.accounts.update).not.toHaveBeenCalled()
  })

  it('rejects an emptied field instead of saving 0 over the debt', async () => {
    await openWith(RAPPI)
    await type(amountInput(), '')
    await submitForm()
    expect(alerts()).toEqual(['Escribe el saldo inicial (puede ser 0)'])
    expect(api.accounts.update).not.toHaveBeenCalled()
  })

  it('sends a debt typed as a positive amount in negative', async () => {
    await openWith(RAPPI)
    await type(amountInput(), '1.200.000')
    await submitForm()
    await vi.waitFor(() => expect(api.accounts.update).toHaveBeenCalledTimes(1))
    expect(vi.mocked(api.accounts.update).mock.calls[0]).toEqual([6, { name: 'Tarjeta Rappi', type: 'tarjeta', initialBalance: -1_200_000, archived: false }])
  })

  it('starts a new account at 0 and still rejects a bad amount', async () => {
    await openWith(null)
    expect(amountInput().value).toBe('0')
    await type(nameInput(), 'Nequi')
    await type(amountInput(), 'abc')
    await submitForm()
    expect(alerts()).toEqual(['Escribe un monto válido'])
    await type(amountInput(), '')
    await submitForm()
    expect(alerts()).toEqual(['Escribe el saldo inicial (puede ser 0)'])
    expect(api.accounts.create).not.toHaveBeenCalled()
  })

  it('creates an account with the balance typed', async () => {
    await openWith(null)
    await type(nameInput(), 'Nequi')
    await type(amountInput(), '350.000')
    await submitForm()
    await vi.waitFor(() => expect(api.accounts.create).toHaveBeenCalledTimes(1))
    expect(vi.mocked(api.accounts.create).mock.calls[0]![0]).toEqual({ name: 'Nequi', type: 'ahorros', initialBalance: 350_000, archived: false })
  })
})

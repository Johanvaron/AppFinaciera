import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { nextTick } from 'vue'
import type { Debt, DebtDetail, DebtEntryType } from '@shared/contract'
import { api, ApiRequestError } from '@/lib/api'
import '@/lib/zod-locale'
import DebtEntryModal from './DebtEntryModal.vue'

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return { ...actual, api: { debts: { addEntry: vi.fn() } } }
})

const MOTO: Debt = {
  id: 3,
  name: 'Moto',
  kind: 'prestamo',
  initialBalance: 9_600_000,
  startDate: '2026-09-01',
  fixedExpenseId: null,
  note: '',
  archived: false,
  balance: 9_600_000,
  paidTotal: 0,
  chargedTotal: 0,
  paidThisMonth: 0,
  lastPaymentDate: null,
}
const DETAIL: DebtDetail = { debt: MOTO, movements: [], monthly: [] }

const dialog = () => document.querySelector('[role="dialog"]')!
const amountInput = () => dialog().querySelector<HTMLInputElement>('input[inputmode="decimal"]')!
const dateInput = () => dialog().querySelector<HTMLInputElement>('input[type="date"]')!
const alerts = () => [...dialog().querySelectorAll('[role="alert"]')].map((el) => el.textContent?.trim())

async function type(input: HTMLInputElement, text: string) {
  input.value = text
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await nextTick()
}
async function submitForm() {
  dialog().querySelector('#debt-entry-form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  await nextTick()
}

describe('DebtEntryModal', () => {
  let wrapper: VueWrapper

  async function openAs(type: DebtEntryType) {
    wrapper = mount(DebtEntryModal, {
      attachTo: document.body,
      props: { open: false, debt: MOTO, type },
      global: { plugins: [createPinia(), [VueQueryPlugin, { queryClient: new QueryClient() }]] },
    })
    await wrapper.setProps({ open: true })
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"] #debt-entry-form')).not.toBeNull())
  }

  beforeEach(() => {
    vi.mocked(api.debts.addEntry).mockReset().mockResolvedValue(DETAIL)
  })

  afterEach(() => wrapper.unmount())

  it('rejects text that is not an amount without sending anything', async () => {
    await openAs('cargo')
    await type(amountInput(), 'abc')
    await submitForm()
    expect(alerts()).toEqual(['Eso no es un monto. Escribe solo el número, por ejemplo 85000 o 85k'])
    expect(api.debts.addEntry).not.toHaveBeenCalled()
  })

  it('asks for the amount when it is left empty', async () => {
    await openAs('abono')
    await submitForm()
    expect(alerts()).toEqual(['Escribe el monto'])
    expect(api.debts.addEntry).not.toHaveBeenCalled()
  })

  it('sends the typed charge with today as the date', async () => {
    await openAs('cargo')
    await type(amountInput(), '85k')
    await submitForm()
    await vi.waitFor(() => expect(api.debts.addEntry).toHaveBeenCalledTimes(1))
    expect(vi.mocked(api.debts.addEntry).mock.calls[0]).toEqual([3, { date: dateInput().value, type: 'cargo', amount: 85_000, description: '' }])
    await vi.waitFor(() => expect(wrapper.emitted('update:open')).toEqual([[false]]))
  })

  it('rejects a future date before sending: the line would move the balance without showing in any month', async () => {
    await openAs('cargo')
    expect(dateInput().getAttribute('max')).toBe(dateInput().value)
    await type(amountInput(), '85000')
    await type(dateInput(), '2027-03-01')
    await submitForm()
    expect(alerts()).toEqual(['La fecha no puede ser futura: anota el cargo o el abono el día que pase'])
    expect(api.debts.addEntry).not.toHaveBeenCalled()
  })

  it('paints a 422 of the amount under its field', async () => {
    vi.mocked(api.debts.addEntry).mockRejectedValue(new ApiRequestError(422, 'Revisa el formulario', { amount: 'El monto debe ser mayor a cero' }))
    await openAs('abono')
    await type(amountInput(), '120000')
    await submitForm()
    await vi.waitFor(() => expect(alerts()).toEqual(['El monto debe ser mayor a cero']))
    expect(amountInput().getAttribute('aria-invalid')).toBe('true')
  })

  it('sends one request when submitted twice before the answer', async () => {
    let resolve!: (detail: DebtDetail) => void
    vi.mocked(api.debts.addEntry).mockReturnValue(new Promise<DebtDetail>((r) => (resolve = r)))
    await openAs('cargo')
    await type(amountInput(), '85000')
    await submitForm()
    await submitForm()
    await vi.waitFor(() => expect(api.debts.addEntry).toHaveBeenCalledTimes(1))
    resolve(DETAIL)
    await vi.waitFor(() => expect(wrapper.emitted('update:open')).toEqual([[false]]))
    expect(api.debts.addEntry).toHaveBeenCalledTimes(1)
  })
})

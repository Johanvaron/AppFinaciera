import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { nextTick } from 'vue'
import type { Debt, FixedExpense } from '@shared/contract'
import { api, ApiRequestError } from '@/lib/api'
import '@/lib/zod-locale'
import DebtFormModal from './DebtFormModal.vue'

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return { ...actual, api: { debts: { create: vi.fn(), update: vi.fn() } } }
})

const BBVA: Debt = {
  id: 1,
  name: 'BBVA 1',
  kind: 'tarjeta',
  initialBalance: 2_000_000,
  startDate: '2026-09-01',
  fixedExpenseId: 7,
  note: '',
  archived: false,
  balance: 1_798_427,
  paidTotal: 351_573,
  chargedTotal: 150_000,
  paidThisMonth: 201_573,
  lastPaymentDate: '2026-10-03',
}
const FIXED: FixedExpense[] = [
  { id: 7, name: 'BBVA 1', amount: 400_000, variableAmount: true, dueDay: 5, categoryId: 3, accountId: null, startMonth: '2026-01', endMonth: null, note: '', position: 0 },
]

const dialog = () => document.querySelector('[role="dialog"]')!
const amountInput = () => dialog().querySelector<HTMLInputElement>('input[inputmode="decimal"]')!
const nameInput = () => dialog().querySelector<HTMLInputElement>('input[type="text"]')!
const alerts = () => [...dialog().querySelectorAll('[role="alert"]')].map((el) => el.textContent?.replace(/\s+/g, ' ').trim())

async function type(input: HTMLInputElement, text: string) {
  input.value = text
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await nextTick()
}
async function submitForm() {
  dialog().querySelector('#debt-form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  await nextTick()
}

describe('DebtFormModal', () => {
  let wrapper: VueWrapper

  async function openWith(editing: Debt | null, extra: { fixedError?: boolean } = {}) {
    wrapper = mount(DebtFormModal, {
      attachTo: document.body,
      props: { open: false, editing, fixedExpenses: FIXED, ...extra },
      global: { plugins: [createPinia(), [VueQueryPlugin, { queryClient: new QueryClient() }]] },
    })
    await wrapper.setProps({ open: true })
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"] #debt-form')).not.toBeNull())
  }

  beforeEach(() => {
    vi.mocked(api.debts.create).mockReset().mockResolvedValue(BBVA)
    vi.mocked(api.debts.update).mockReset().mockResolvedValue(BBVA)
  })

  afterEach(() => wrapper.unmount())

  it('rejects text that is not an amount without sending anything', async () => {
    await openWith(BBVA)
    expect(amountInput().value).toBe('2.000.000')
    await type(amountInput(), 'abc')
    await submitForm()
    expect(alerts()).toEqual(['Eso no es un monto. Escribe solo el número, por ejemplo 2500000 o 2,5m'])
    expect(api.debts.update).not.toHaveBeenCalled()
  })

  it('asks for the initial balance when it is left empty, instead of saving 0', async () => {
    await openWith(BBVA)
    await type(amountInput(), '')
    await submitForm()
    expect(alerts()).toEqual(['Escribe cuánto debías'])
    expect(api.debts.update).not.toHaveBeenCalled()
  })

  it('paints a 422 of the fixed expense under its select', async () => {
    vi.mocked(api.debts.create).mockRejectedValue(new ApiRequestError(422, 'Revisa el formulario', { fixedExpenseId: 'Ese gasto fijo ya paga otra deuda' }))
    await openWith(null)
    await type(nameInput(), 'Moto')
    await type(amountInput(), '9.600.000')
    await submitForm()
    await vi.waitFor(() => expect(api.debts.create).toHaveBeenCalledTimes(1))
    await vi.waitFor(() => expect(alerts()).toEqual(['Ese gasto fijo ya paga otra deuda']))
    expect(dialog().querySelector('select')!.getAttribute('aria-invalid')).toBe('true')
  })

  it('sends one request when the form is submitted twice before the answer', async () => {
    let resolve!: (debt: Debt) => void
    vi.mocked(api.debts.create).mockReturnValue(new Promise<Debt>((r) => (resolve = r)))
    await openWith(null)
    await type(nameInput(), 'Moto')
    await type(amountInput(), '9600000')
    await submitForm()
    await submitForm()
    await vi.waitFor(() => expect(api.debts.create).toHaveBeenCalledTimes(1))
    resolve(BBVA)
    await vi.waitFor(() => expect(wrapper.emitted('update:open')).toEqual([[false]]))
    expect(api.debts.create).toHaveBeenCalledTimes(1)
  })

  it('says so when the fixed expenses could not be loaded instead of offering "Ninguno" alone', async () => {
    await openWith(null, { fixedError: true })
    expect(dialog().querySelector('[role="alert"] span')!.textContent).toBe('No se pudieron cargar los gastos fijos: la lista está incompleta. Puedes guardar sin enlazar y enlazar después.')
    dialog().querySelector<HTMLButtonElement>('[role="alert"] button')!.click()
    expect(wrapper.emitted('retryFixed')).toHaveLength(1)
  })
})

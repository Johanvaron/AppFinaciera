import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { nextTick } from 'vue'
import type { Account, Category, Transaction } from '@shared/contract'
import { api, ApiRequestError } from '@/lib/api'
import { useQuickAdd } from '@/stores/quickAdd'
import TransactionModal from './TransactionModal.vue'

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    api: {
      accounts: { list: vi.fn() },
      categories: { list: vi.fn() },
      transactions: { create: vi.fn(), update: vi.fn() },
    },
  }
})

const ACCOUNTS: Account[] = [
  { id: 3, name: 'Nequi', type: 'billetera', initialBalance: 0, archived: false, balance: 0 },
  { id: 4, name: 'Bancolombia', type: 'ahorros', initialBalance: 0, archived: false, balance: 0 },
]
const CATEGORIES: Category[] = [
  { id: 7, name: 'Mercado', kind: 'expense', group: 'variables', color: 'green', archived: false },
  { id: 8, name: 'Arriendo', kind: 'expense', group: 'fijos', color: 'blue', archived: false },
  { id: 9, name: 'Sueldo', kind: 'income', group: 'ingresos', color: 'teal', archived: false },
]
const RENT_PAYMENT: Transaction = {
  id: 21,
  date: '2026-10-01',
  amount: 514381,
  type: 'expense',
  accountId: 4,
  toAccountId: null,
  categoryId: 8,
  description: 'Arriendo octubre',
  note: '',
  fixedExpenseId: 5,
  fixedMonth: '2026-10',
  createdAt: '2026-10-01T12:00:00',
}

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!
const amountInput = () => $<HTMLInputElement>('[role="dialog"] input[inputmode="decimal"]')
const selects = () => [...document.querySelectorAll<HTMLSelectElement>('[role="dialog"] select')]
const typeButton = (label: string) => [...document.querySelectorAll<HTMLButtonElement>('[role="radio"]')].find((b) => b.textContent?.trim() === label)!
const button = (label: string) => [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find((b) => b.textContent?.trim() === label)!
const dialogText = () => $('[role="dialog"]').textContent ?? ''

async function type(input: HTMLInputElement, text: string) {
  input.value = text
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await nextTick()
}
async function choose(select: HTMLSelectElement, value: number) {
  select.value = String(value)
  select.dispatchEvent(new Event('change', { bubbles: true }))
  await nextTick()
}
async function submitForm() {
  $('#transaction-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  await nextTick()
}

describe('TransactionModal', () => {
  let wrapper: VueWrapper
  let quickAdd: ReturnType<typeof useQuickAdd>

  beforeEach(async () => {
    localStorage.clear()
    vi.mocked(api.accounts.list).mockResolvedValue(ACCOUNTS)
    vi.mocked(api.categories.list).mockResolvedValue(CATEGORIES)
    vi.mocked(api.transactions.create).mockReset().mockResolvedValue({ ...RENT_PAYMENT, id: 99 })
    vi.mocked(api.transactions.update).mockReset().mockResolvedValue(RENT_PAYMENT)
    const pinia = createPinia()
    setActivePinia(pinia)
    wrapper = mount(TransactionModal, { attachTo: document.body, global: { plugins: [pinia, VueQueryPlugin] } })
    quickAdd = useQuickAdd()
    await vi.waitFor(() => expect(api.categories.list).toHaveBeenCalled())
  })

  afterEach(() => wrapper.unmount())

  async function open(action: () => void) {
    action()
    await vi.waitFor(() => expect(selects()[0]!.options.length).toBeGreaterThan(1))
  }

  it('says what is missing and sends nothing', async () => {
    await open(() => quickAdd.openNew())
    await submitForm()
    expect(dialogText()).toContain('El monto debe ser mayor a cero')
    expect(dialogText()).toContain('Elige una categoría')
    expect(api.transactions.create).not.toHaveBeenCalled()
  })

  it('"Guardar y agregar otro" saves, stays open and keeps category and account', async () => {
    await open(() => quickAdd.openNew())
    await type(amountInput(), '200k')
    await choose(selects()[0]!, 7)
    await choose(selects()[1]!, 4)
    button('Guardar y agregar otro').click()

    await vi.waitFor(() => expect(amountInput().value).toBe(''))
    expect(vi.mocked(api.transactions.create).mock.calls[0]![0]).toMatchObject({ amount: 200000, type: 'expense', categoryId: 7, accountId: 4, toAccountId: null })
    expect(quickAdd.open).toBe(true)
    expect(selects()[0]!.value).toBe('7')
    expect(selects()[1]!.value).toBe('4')
  })

  it('opens blank after a movement was left half typed', async () => {
    await open(() => quickAdd.openNew())
    await type(amountInput(), '78.000')
    await choose(selects()[0]!, 7)
    quickAdd.close()
    await nextTick()
    await open(() => quickAdd.openNew())
    expect(amountInput().value).toBe('')
    expect(selects()[0]!.selectedOptions[0]!.textContent).toBe('Elige una categoría')
  })

  it('keeps the category when the active type is clicked again, clears it on a real change', async () => {
    await open(() => quickAdd.openNew())
    await choose(selects()[0]!, 7)
    typeButton('Gasto').click()
    await nextTick()
    expect(selects()[0]!.value).toBe('7')

    typeButton('Ingreso').click()
    await nextTick()
    expect(selects()[0]!.selectedOptions[0]!.textContent).toBe('Elige una categoría')
    expect([...selects()[0]!.options].map((o) => o.textContent)).toEqual(['Elige una categoría', 'Sueldo'])
  })

  it('editing the payment of a fixed expense: filled in, and it cannot stop being an expense', async () => {
    await open(() => quickAdd.openEdit(RENT_PAYMENT))
    expect(amountInput().value).toBe('514.381')
    expect(selects()[0]!.value).toBe('8')
    expect(dialogText()).toContain('pago de un gasto fijo')
    expect(typeButton('Ingreso').disabled).toBe(true)
    expect(typeButton('Transferencia').disabled).toBe(true)
    expect(typeButton('Gasto').disabled).toBe(false)

    await type(amountInput(), '520.000')
    await submitForm()
    await vi.waitFor(() => expect(quickAdd.open).toBe(false))
    expect(api.transactions.update).toHaveBeenCalledWith(21, expect.objectContaining({ amount: 520000, type: 'expense', categoryId: 8, accountId: 4 }))
  })

  it('shows a server rejection on a field the form has no input for', async () => {
    vi.mocked(api.transactions.update).mockRejectedValue(
      new ApiRequestError(422, 'Revisa los datos del formulario', { type: 'El pago de un gasto fijo tiene que seguir siendo un gasto' }),
    )
    await open(() => quickAdd.openEdit({ ...RENT_PAYMENT, fixedExpenseId: null, fixedMonth: null }))
    await submitForm()
    await vi.waitFor(() => expect(dialogText()).toContain('El pago de un gasto fijo tiene que seguir siendo un gasto'))
    expect(quickAdd.open).toBe(true)
  })

  it('shows a server rejection next to its field', async () => {
    vi.mocked(api.transactions.create).mockRejectedValue(new ApiRequestError(422, 'Revisa los datos del formulario', { categoryId: 'Elige una categoría de gastos' }))
    await open(() => quickAdd.openNew())
    await type(amountInput(), '500')
    await choose(selects()[0]!, 7)
    await submitForm()
    await vi.waitFor(() => expect(dialogText()).toContain('Elige una categoría de gastos'))
    expect(dialogText()).not.toContain('Revisa los datos del formulario')
  })
})

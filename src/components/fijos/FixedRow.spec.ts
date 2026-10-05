import { mount, type VueWrapper } from '@vue/test-utils'
import type { FixedMonthItem } from '@shared/contract'
import FixedRow from './FixedRow.vue'
import { fixedItem } from './fixtures'

describe('FixedRow: amount edited in the row', () => {
  let wrapper: VueWrapper

  function mountRow(item: FixedMonthItem) {
    wrapper = mount(FixedRow, { attachTo: document.body, props: { item, category: undefined, first: true, last: true } })
  }
  const amountButton = () => wrapper.find<HTMLButtonElement>('button[title="Cambiar el monto solo este mes"]')
  const field = () => wrapper.find<HTMLInputElement>('input')

  async function typeAndEnter(text: string) {
    await amountButton().trigger('click')
    await field().setValue(text)
    await field().trigger('keydown', { key: 'Enter' })
  }

  afterEach(() => wrapper.unmount())

  it('saves the typed amount for this month', async () => {
    mountRow(fixedItem({ expectedAmount: 600_000 }))
    await typeAndEnter('650000')
    expect(wrapper.emitted('amount')).toEqual([[650_000]])
    expect(field().exists()).toBe(false)
  })

  it('rejects text that is not a number with a message and sends nothing', async () => {
    mountRow(fixedItem({ expectedAmount: 600_000 }))
    await typeAndEnter('abc')
    expect(wrapper.emitted('amount')).toBeUndefined()
    expect(wrapper.find('[role="alert"]').text()).toBe('Eso no es un monto')
    expect(field().element.value).toBe('abc')

    await field().trigger('focusout')
    expect(wrapper.emitted('amount')).toBeUndefined()
  })

  it("takes this month's own amount away when the field is emptied", async () => {
    mountRow(fixedItem({ expectedAmount: 650_000, hasOverride: true }))
    await typeAndEnter('')
    expect(wrapper.emitted('amount')).toEqual([[null]])
  })

  it('gives the focus back to the amount button after Enter and after Esc', async () => {
    mountRow(fixedItem({ expectedAmount: 600_000 }))
    await typeAndEnter('650000')
    await vi.waitFor(() => expect(document.activeElement).toBe(amountButton().element))

    await amountButton().trigger('click')
    expect(document.activeElement).toBe(field().element)
    await field().trigger('keydown', { key: 'Escape' })
    await vi.waitFor(() => expect(document.activeElement).toBe(amountButton().element))
    expect(wrapper.emitted('amount')).toEqual([[650_000]])
  })

  it('gives the focus to the amount button after "Volver a $ 600.000"', async () => {
    mountRow(fixedItem({ expectedAmount: 650_000, hasOverride: true }))
    const reset = wrapper.findAll('button').find((b) => b.text() === 'Volver a $ 600.000')!
    reset.element.focus()
    await reset.trigger('click')
    expect(wrapper.emitted('amount')).toEqual([[null]])
    await vi.waitFor(() => expect(document.activeElement).toBe(amountButton().element))
  })

  it('sends nothing when an amount that is not of this month is emptied', async () => {
    mountRow(fixedItem({ expectedAmount: 600_000, hasOverride: false }))
    await typeAndEnter('')
    expect(wrapper.emitted('amount')).toBeUndefined()
    expect(field().exists()).toBe(false)
  })
})

describe('FixedRow: partly paid', () => {
  it('shows what is still owed and what was paid, and offers to delete the payments', async () => {
    const wrapper = mount(FixedRow, {
      attachTo: document.body,
      props: { item: fixedItem({ expectedAmount: 1_143_416, paidAmount: 500_000, transactionIds: [41] }), category: undefined, first: true, last: true },
    })
    expect(wrapper.find('button[title="Cambiar el monto solo este mes"]').text()).toBe('$ 643.416')
    expect(wrapper.text()).toContain('Abonado $ 500.000 de $ 1.143.416')

    await wrapper.find('button[aria-haspopup="menu"]').trigger('click')
    const options = wrapper.findAll<HTMLButtonElement>('[role="menuitem"]')
    expect(options.map((o) => o.text())).toContain('Borrar abonos')
    expect(options.find((o) => o.text() === 'No aplica este mes')!.element.disabled).toBe(true)
    wrapper.unmount()
  })
})

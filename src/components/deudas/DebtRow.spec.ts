import { mount } from '@vue/test-utils'
import type { Debt } from '@shared/contract'
import DebtRow from './DebtRow.vue'

const MOTO: Debt = {
  id: 3,
  name: 'Moto',
  kind: 'prestamo',
  initialBalance: 9_000_000,
  startDate: '2026-09-01',
  fixedExpenseId: 4,
  note: '',
  archived: false,
  balance: 8_400_000,
  paidTotal: 600_000,
  chargedTotal: 0,
  paidThisMonth: 600_000,
  lastPaymentDate: '2026-10-01',
}

function mountRow(debt: Debt, fixedName?: string) {
  return mount(DebtRow, { props: { debt, fixedName } })
}

describe('DebtRow', () => {
  it('shows the figures a person reads: balance, this month, last payment, kind and the fixed expense', () => {
    const text = mountRow(MOTO, 'Moto').text()
    expect(text).toContain('$ 8.400.000')
    expect(text).toContain('Pagaste $ 600.000 este mes')
    expect(text).toContain('Último pago: jue 1 oct')
    expect(text).toContain('Préstamo')
    expect(text).toContain('Se descuenta sola con «Moto»')
  })

  it('says "Pagada" in green when nothing is owed and marks an archived debt', () => {
    const wrapper = mountRow({ ...MOTO, balance: 0, archived: true })
    expect(wrapper.text()).toContain('Pagada')
    expect(wrapper.text()).toContain('Archivada')
    expect(wrapper.find('.text-success').exists()).toBe(true)
    expect(wrapper.find('.text-danger').exists()).toBe(false)
  })

  it('opens the detail once from the name button and once from a click on the row', async () => {
    const wrapper = mountRow(MOTO)
    await wrapper.find('button[aria-label="Ver detalle de Moto"]').trigger('click')
    expect(wrapper.emitted('open')).toHaveLength(1)
    await wrapper.find('.cursor-pointer').trigger('click')
    expect(wrapper.emitted('open')).toHaveLength(2)
  })

  it('offers Restaurar instead of Archivar on an archived debt', async () => {
    const wrapper = mountRow({ ...MOTO, archived: true })
    await wrapper.find('button[aria-label="Acciones de Moto"]').trigger('click')
    const labels = wrapper.findAll('[role="menuitem"]').map((b) => b.text())
    expect(labels).toEqual(['Editar', 'Restaurar', 'Eliminar'])
  })
})

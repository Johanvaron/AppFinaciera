import type { Debt } from '@shared/contract'
import {
  balanceText,
  debtPatch,
  formValues,
  headlineTotal,
  lastPaymentText,
  linkText,
  monthBarRatio,
  movementAmountText,
  movementText,
  movementTone,
  paidThisMonthLabel,
  paidThisMonthText,
  progressRatio,
  splitDebts,
  totalDebtStat,
} from './debts'

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

describe('balance and totals', () => {
  it('shows the balance in red while something is owed', () => {
    expect(balanceText(BBVA)).toEqual({ text: '$ 1.798.427', tone: 'danger' })
  })

  it('shows "Pagada" at zero and the money in favor when more was paid than owed', () => {
    expect(balanceText({ balance: 0 })).toEqual({ text: 'Pagada', tone: 'success' })
    expect(balanceText({ balance: -76_726_311 })).toEqual({ text: 'Saldo a favor $ 76.726.311', tone: 'success' })
  })

  it('headline adds only what is owed: a saldo a favor on one debt does not hide the other', () => {
    // Reproduced against the API: BBVA 1 overpaid + Moto with 9.6M gave totalDebt = -67.126.311 and "Sin deudas".
    const rows = [
      { balance: -76_726_311, archived: false },
      { balance: 9_600_000, archived: false },
    ]
    expect(headlineTotal(rows)).toEqual({ value: '$ 9.600.000', tone: 'danger' })
    expect(headlineTotal([{ balance: 5_000, archived: true }, { balance: 0, archived: false }])).toEqual({ value: 'Sin deudas', tone: 'success' })
  })

  it('headline total: red figure, or "Sin deudas" at zero', () => {
    expect(totalDebtStat(12_500_000)).toEqual({ value: '$ 12.500.000', tone: 'danger' })
    expect(totalDebtStat(0)).toEqual({ value: 'Sin deudas', tone: 'success' })
  })
})

describe('progress', () => {
  it('is paid over initial plus charges, not over the initial alone', () => {
    // 351.573 / (2.000.000 + 150.000)
    expect(progressRatio(BBVA)).toBeCloseTo(0.1635, 4)
  })

  it('passes 1 when more was paid than owed, and is null when nothing was owed', () => {
    expect(progressRatio({ initialBalance: 100_000, chargedTotal: 0, paidTotal: 120_000 })).toBeCloseTo(1.2)
    expect(progressRatio({ initialBalance: 0, chargedTotal: 0, paidTotal: 0 })).toBeNull()
  })
})

describe('row lines', () => {
  it('says how much was paid this month, with this month\'s figure and not the total', () => {
    expect(paidThisMonthText(BBVA, '2026-10')).toBe('Pagaste $ 201.573 en octubre (por fecha de pago)')
    expect(paidThisMonthText({ paidThisMonth: 0 }, '2026-10')).toBe('Sin pagos en octubre')
  })

  it('labels the monthly figure by payment date, so it is not read as the checklist month', () => {
    expect(paidThisMonthLabel('2026-10')).toBe('Pagado en octubre (por fecha de pago)')
    expect(paidThisMonthLabel('2027-01')).toBe('Pagado en enero (por fecha de pago)')
  })

  it('shows the last payment date when there is one', () => {
    expect(lastPaymentText(BBVA)).toBe('Último pago: sáb 3 oct')
    expect(lastPaymentText({ lastPaymentDate: null })).toBeNull()
  })

  it('names the fixed expense that pays it, or falls back when it is not in this month', () => {
    expect(linkText(7, 'BBVA 1')).toBe('Se descuenta sola con «BBVA 1»')
    expect(linkText(7, undefined)).toBe('Enlazada a un gasto fijo')
    expect(linkText(null, 'BBVA 1')).toBeNull()
  })
})

describe('movements', () => {
  it('a charge is + in amber and a payment is - in green', () => {
    expect(movementAmountText({ type: 'cargo', amount: 85_000 })).toBe('+$ 85.000')
    expect(movementAmountText({ type: 'abono', amount: 120_000 })).toBe('-$ 120.000')
    expect(movementTone('cargo')).toBe('warning')
    expect(movementTone('abono')).toBe('success')
  })

  it('labels a line without description by what it is', () => {
    expect(movementText({ type: 'cargo', amount: 1, source: 'entry', description: 'Cuota de manejo' })).toBe('Cuota de manejo')
    expect(movementText({ type: 'abono', amount: 1, source: 'payment', description: '' })).toBe('Pago del gasto fijo')
    expect(movementText({ type: 'cargo', amount: 1, source: 'entry', description: '' })).toBe('Cargo')
    expect(movementText({ type: 'abono', amount: 1, source: 'entry', description: '' })).toBe('Abono')
  })

  it('month bars scale to the highest closing balance and never go negative', () => {
    const rows = [{ balanceEnd: 2_000_000 }, { balanceEnd: 1_500_000 }, { balanceEnd: -20_000 }]
    expect(monthBarRatio(rows[0]!, rows)).toBe(1)
    expect(monthBarRatio(rows[1]!, rows)).toBe(0.75)
    expect(monthBarRatio(rows[2]!, rows)).toBe(0)
    expect(monthBarRatio({ balanceEnd: 0 }, [{ balanceEnd: 0 }])).toBe(0)
  })
})

describe('edit form', () => {
  it('sends only what changed', () => {
    const values = { ...formValues(BBVA), name: 'BBVA Visa', initialBalance: 2_250_000 }
    expect(debtPatch(BBVA, values)).toEqual({ name: 'BBVA Visa', initialBalance: 2_250_000 })
  })

  it('sends nothing when nothing changed, and null when the link is removed', () => {
    expect(debtPatch(BBVA, formValues(BBVA))).toEqual({})
    expect(debtPatch(BBVA, { ...formValues(BBVA), fixedExpenseId: null })).toEqual({ fixedExpenseId: null })
  })
})

describe('list sections', () => {
  it('splits archived debts out of the active list', () => {
    const old = { ...BBVA, id: 2, name: 'Vieja', archived: true }
    expect(splitDebts([BBVA, old])).toEqual({ active: [BBVA], archived: [old] })
  })
})

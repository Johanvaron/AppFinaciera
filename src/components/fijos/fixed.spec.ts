import { describe, expect, it } from 'vitest'
import type { FixedMonthItem } from '@shared/contract'
import { dueText, moveId, needsAmount, progressRatio, progressText, resetOverrideLabel, rowAmount, rowAmountText, statusTone } from './fixed'

function item(overrides: Partial<FixedMonthItem> & { variableAmount?: boolean } = {}): FixedMonthItem {
  const { variableAmount = false, ...rest } = overrides
  return {
    fixed: {
      id: 1,
      name: 'Moto',
      amount: 600_000,
      variableAmount,
      dueDay: 5,
      categoryId: 3,
      accountId: null,
      startMonth: '2026-01',
      endMonth: null,
      note: '',
      position: 0,
    },
    month: '2026-10',
    expectedAmount: 600_000,
    hasOverride: false,
    paidAmount: 0,
    status: 'pending',
    dueDate: '2026-10-05',
    paidDate: null,
    transactionIds: [],
    ...rest,
  }
}

describe('dueText', () => {
  const today = '2026-10-08'

  it('shows the due date of a pending item', () => {
    expect(dueText(item({ dueDate: '2026-10-09' }), today)).toEqual({ text: 'Vence vie 9 oct', danger: false })
  })

  it('says "hoy" when it is due today', () => {
    expect(dueText(item({ dueDate: today }), today)).toEqual({ text: 'Vence hoy', danger: false })
  })

  it('counts the days of an overdue item against the injected today', () => {
    expect(dueText(item({ status: 'overdue', dueDate: '2026-10-05' }), today)).toEqual({ text: 'Venció hace 3 días', danger: true })
    expect(dueText(item({ status: 'overdue', dueDate: '2026-10-05' }), '2026-10-25')).toEqual({ text: 'Venció hace 20 días', danger: true })
  })

  it('uses "ayer" for one day late', () => {
    expect(dueText(item({ status: 'overdue', dueDate: '2026-10-07' }), today)).toEqual({ text: 'Venció ayer', danger: true })
  })

  it('counts across a month boundary', () => {
    expect(dueText(item({ status: 'overdue', dueDate: '2026-09-28' }), '2026-10-02').text).toBe('Venció hace 4 días')
  })

  it('shows the PAYMENT date when paid, not the due date', () => {
    expect(dueText(item({ status: 'paid', dueDate: '2026-10-05', paidDate: '2026-10-02' }), today)).toEqual({ text: 'Pagado el vie 2 oct', danger: false })
  })

  it('handles items without due date', () => {
    expect(dueText(item({ dueDate: null }), today)).toEqual({ text: 'Sin fecha de pago', danger: false })
    expect(dueText(item({ status: 'overdue', dueDate: null }), today)).toEqual({ text: 'Vencido', danger: true })
  })

  it('shows no date for a skipped item', () => {
    expect(dueText(item({ status: 'skipped' }), today)).toEqual({ text: '', danger: false })
  })
})

describe('row amount', () => {
  it('shows the expected amount while unpaid', () => {
    const pending = item({ expectedAmount: 514_381, paidAmount: 0 })
    expect(rowAmount(pending)).toBe(514_381)
    expect(rowAmountText(pending)).toBe('$ 514.381')
  })

  it('shows what was actually paid when paid', () => {
    const paid = item({ status: 'paid', expectedAmount: 600_000, paidAmount: 587_250 })
    expect(rowAmount(paid)).toBe(587_250)
    expect(rowAmountText(paid)).toBe('$ 587.250')
  })

  it('asks for the amount of an unpaid variable item at zero', () => {
    const card = item({ variableAmount: true, expectedAmount: 0 })
    expect(needsAmount(card)).toBe(true)
    expect(rowAmountText(card)).toBeNull()
    expect(needsAmount(item({ variableAmount: true, expectedAmount: 0, status: 'overdue' }))).toBe(true)
  })

  it('does not ask once the month has an amount, it is paid, or it is not variable', () => {
    expect(rowAmountText(item({ variableAmount: true, expectedAmount: 1_143_415 }))).toBe('$ 1.143.415')
    expect(rowAmountText(item({ variableAmount: true, expectedAmount: 0, status: 'paid', paidAmount: 78_000 }))).toBe('$ 78.000')
    expect(rowAmountText(item({ expectedAmount: 0 }))).toBe('$ 0')
  })

  it('shows a dash for a skipped item without amount', () => {
    expect(rowAmountText(item({ status: 'skipped', variableAmount: true, expectedAmount: 0 }))).toBe('—')
    expect(rowAmountText(item({ status: 'skipped', expectedAmount: 200_000 }))).toBe('$ 200.000')
  })

  it('labels the way back to the base amount', () => {
    expect(resetOverrideLabel(500_000)).toBe('Volver a $ 500.000')
    expect(resetOverrideLabel(0)).toBe('Quitar monto')
  })
})

describe('moveId', () => {
  const ids = [10, 20, 30, 40]

  it('moves up and down by one place', () => {
    expect(moveId(ids, 30, -1)).toEqual([10, 30, 20, 40])
    expect(moveId(ids, 20, 1)).toEqual([10, 30, 20, 40])
    expect(moveId(ids, 10, 1)).toEqual([20, 10, 30, 40])
  })

  it('returns null at the edges or for an unknown id', () => {
    expect(moveId(ids, 10, -1)).toBeNull()
    expect(moveId(ids, 40, 1)).toBeNull()
    expect(moveId(ids, 99, 1)).toBeNull()
  })

  it('does not mutate the input', () => {
    moveId(ids, 30, -1)
    expect(ids).toEqual([10, 20, 30, 40])
  })
})

describe('badge and progress', () => {
  it('maps each status to its tone', () => {
    expect(statusTone('paid')).toBe('success')
    expect(statusTone('pending')).toBe('neutral')
    expect(statusTone('overdue')).toBe('danger')
    expect(statusTone('skipped')).toBe('neutral')
  })

  it('writes the progress as "paid de total"', () => {
    expect(progressText(3, 8)).toBe('3 de 8')
    expect(progressRatio(3, 8)).toBe(0.375)
    expect(progressRatio(0, 0)).toBeNull()
  })
})

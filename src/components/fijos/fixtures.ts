/** Test data shared by the specs of this folder. */
import type { FixedMonthItem } from '@shared/contract'

/** A pending "Moto" of $ 600.000 in October 2026; override what the test is about. */
export function fixedItem(overrides: Partial<FixedMonthItem> & { variableAmount?: boolean } = {}): FixedMonthItem {
  const { variableAmount = false, ...rest } = overrides
  const item = {
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
    status: 'pending' as FixedMonthItem['status'],
    dueDate: '2026-10-05',
    paidDate: null,
    transactionIds: [],
    ...rest,
  }
  // Same rule as the server: nothing left once paid or skipped.
  const settled = item.status === 'paid' || item.status === 'skipped'
  return { ...item, remainingAmount: rest.remainingAmount ?? (settled ? 0 : Math.max(item.expectedAmount - item.paidAmount, 0)) }
}

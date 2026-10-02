import type { Account, Category } from '@shared/contract'
import { formatMoney } from '@/lib/format'
import {
  BACKUP_ERRORS,
  checkBackup,
  fromSignedBalance,
  groupCategories,
  isRestoreConfirmed,
  kindForGroup,
  splitArchived,
  toSignedBalance,
  totalBalance,
} from './settings'

const account = (id: number, balance: number, archived = false): Account => ({
  id,
  name: `Cuenta ${id}`,
  type: 'ahorros',
  initialBalance: 0,
  archived,
  balance,
})

const category = (id: number, group: Category['group'], archived = false): Category => ({
  id,
  name: `Cat ${id}`,
  kind: group === 'ingresos' ? 'income' : 'expense',
  group,
  color: 'blue',
  archived,
})

describe('kindForGroup', () => {
  it('only the income group is income', () => {
    expect(kindForGroup('ingresos')).toBe('income')
    expect(kindForGroup('fijos')).toBe('expense')
    expect(kindForGroup('variables')).toBe('expense')
    expect(kindForGroup('ahorro')).toBe('expense')
  })
})

describe('signed initial balance', () => {
  it('sends debt as a negative number', () => {
    expect(toSignedBalance(850_000, true)).toBe(-850_000)
    expect(toSignedBalance(850_000, false)).toBe(850_000)
  })

  it('treats an empty input as zero, never as negative zero', () => {
    expect(toSignedBalance(null, false)).toBe(0)
    expect(Object.is(toSignedBalance(null, true), 0)).toBe(true)
    expect(Object.is(toSignedBalance(0, true), 0)).toBe(true)
  })

  it('goes back to amount + checkbox when editing', () => {
    expect(fromSignedBalance(-1_250_000)).toEqual({ amount: 1_250_000, isDebt: true })
    expect(fromSignedBalance(320_000)).toEqual({ amount: 320_000, isDebt: false })
    expect(fromSignedBalance(0)).toEqual({ amount: 0, isDebt: false })
  })

  it('round-trips', () => {
    for (const value of [-514_381, 0, 78_000]) {
      const { amount, isDebt } = fromSignedBalance(value)
      expect(toSignedBalance(amount, isDebt)).toBe(value)
    }
  })
})

describe('totalBalance', () => {
  it('adds the non-archived accounts, debts included', () => {
    const accounts = [account(1, 1_250_000), account(2, -300_000), account(3, 999_000, true)]
    expect(formatMoney(totalBalance(accounts))).toBe('$ 950.000')
  })

  it('can be negative', () => {
    expect(formatMoney(totalBalance([account(1, 100_000), account(2, -514_381)]))).toBe('-$ 414.381')
  })

  it('is zero without accounts', () => {
    expect(formatMoney(totalBalance([]))).toBe('$ 0')
  })
})

describe('splitArchived', () => {
  it('keeps the order and separates archived', () => {
    const { active, archived } = splitArchived([account(1, 0), account(2, 0, true), account(3, 0)])
    expect(active.map((a) => a.id)).toEqual([1, 3])
    expect(archived.map((a) => a.id)).toEqual([2])
  })
})

describe('groupCategories', () => {
  const result = groupCategories([
    category(1, 'variables'),
    category(2, 'ingresos'),
    category(3, 'fijos', true),
    category(4, 'variables'),
    category(5, 'ingresos', true),
  ])

  it('lists every group in contract order with its label', () => {
    expect(result.sections.map((s) => s.label)).toEqual(['Ingresos', 'Gastos fijos', 'Gastos variables', 'Ahorro'])
  })

  it('puts only active categories in their group', () => {
    expect(result.sections.map((s) => s.items.map((c) => c.id))).toEqual([[2], [], [1, 4], []])
  })

  it('collects archived ones apart', () => {
    expect(result.archived.map((c) => c.id)).toEqual([3, 5])
  })
})

describe('checkBackup', () => {
  const valid = {
    app: 'app-financiera',
    version: 1,
    // 9:30 pm local on Oct 2: in Colombia the UTC text already says Oct 3.
    exportedAt: new Date(2026, 9, 2, 21, 30).toISOString(),
    accounts: [1, 2, 3],
    categories: Array.from({ length: 14 }, () => 0),
    transactions: Array.from({ length: 1250 }, () => 0),
    fixedExpenses: [1],
    fixedMonths: [],
    budgets: [1, 2, 3, 4, 5, 6, 7],
  }

  it('summarizes a valid file with distinct counts and the date', () => {
    const result = checkBackup(JSON.stringify(valid))
    if (!result.ok) throw new Error(result.message)
    expect(result.summary.lines).toEqual(['3 cuentas', '14 categorías', '1.250 movimientos', '1 gasto fijo', '7 presupuestos'])
    expect(result.summary.dateLabel).toBe('2 de octubre de 2026')
    expect(result.file.accounts).toHaveLength(3)
  })

  it('uses singular and zero forms', () => {
    const result = checkBackup(JSON.stringify({ ...valid, accounts: [1], categories: [1], transactions: [], fixedExpenses: [1, 2], budgets: [1] }))
    if (!result.ok) throw new Error(result.message)
    expect(result.summary.lines).toEqual(['1 cuenta', '1 categoría', '0 movimientos', '2 gastos fijos', '1 presupuesto'])
  })

  it('tolerates a missing or broken date', () => {
    for (const exportedAt of [undefined, 'ayer', 20261002]) {
      const result = checkBackup(JSON.stringify({ ...valid, exportedAt }))
      if (!result.ok) throw new Error(result.message)
      expect(result.summary.dateLabel).toBe('fecha desconocida')
    }
  })

  it('rejects text that is not JSON', () => {
    expect(checkBackup('hola {')).toEqual({ ok: false, message: 'El archivo no se pudo leer: no es un respaldo válido.' })
    expect(checkBackup('')).toEqual({ ok: false, message: BACKUP_ERRORS.json })
    expect(checkBackup('[1,2]')).toEqual({ ok: false, message: BACKUP_ERRORS.json })
    expect(checkBackup('null')).toEqual({ ok: false, message: BACKUP_ERRORS.json })
  })

  it('rejects a file from another app', () => {
    expect(checkBackup(JSON.stringify({ ...valid, app: 'otra-app' }))).toEqual({
      ok: false,
      message: 'Este archivo no es un respaldo de esta aplicación.',
    })
    expect(checkBackup('{}')).toEqual({ ok: false, message: BACKUP_ERRORS.app })
  })

  it('rejects another version', () => {
    expect(checkBackup(JSON.stringify({ ...valid, version: 2 }))).toEqual({
      ok: false,
      message: 'Este respaldo es de una versión que esta aplicación no sabe leer.',
    })
    expect(checkBackup(JSON.stringify({ ...valid, version: '1' }))).toEqual({ ok: false, message: BACKUP_ERRORS.version })
  })

  it('rejects a file without its lists', () => {
    const incomplete: Record<string, unknown> = { ...valid }
    delete incomplete.transactions
    expect(checkBackup(JSON.stringify(incomplete))).toEqual({ ok: false, message: 'El respaldo está incompleto: le faltan datos.' })
  })

  it('rejects a file without the lists the server also requires', () => {
    for (const key of ['fixedMonths', 'budgets']) {
      const incomplete: Record<string, unknown> = { ...valid }
      delete incomplete[key]
      expect(checkBackup(JSON.stringify(incomplete))).toEqual({ ok: false, message: BACKUP_ERRORS.incomplete })
    }
  })
})

describe('isRestoreConfirmed', () => {
  it('needs the exact word in capitals', () => {
    expect(isRestoreConfirmed('RESTAURAR')).toBe(true)
    expect(isRestoreConfirmed(' RESTAURAR ')).toBe(true)
    expect(isRestoreConfirmed('restaurar')).toBe(false)
    expect(isRestoreConfirmed('RESTAURA')).toBe(false)
    expect(isRestoreConfirmed('')).toBe(false)
  })
})

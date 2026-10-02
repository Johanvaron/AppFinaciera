import type { Category, CategoryTotal, DailyPoint } from '@shared/contract'
import {
  availableStat,
  categoryBars,
  changeDetail,
  dueText,
  expectedAmountText,
  fixedStat,
  isEmptyMonth,
  paceSeries,
  paceSummary,
  savingsStat,
  signedAmount,
  transactionTitle,
  welcomeSteps,
} from './summary'

const category = (id: number, name: string): Category => ({ id, name, kind: 'expense', group: 'variables', color: 'blue', archived: false })
const total = (id: number, name: string, amount: number, share: number): CategoryTotal => ({ category: category(id, name), total: amount, count: 1, share })
const day = (n: number, spent: number, cumulative: number | null): DailyPoint => ({ date: `2026-10-${String(n).padStart(2, '0')}`, spent, cumulative })

describe('spending pace sentence', () => {
  const daily = [day(1, 100000, 100000), day(2, 250000, 350000), day(3, 0, 350000), day(4, 0, null), day(5, 0, null)]

  const previous = { month: '2026-09' }
  const today = '2026-10-03'

  it('compares against the same day of the previous month', () => {
    const pace = paceSummary({ daily, previousDailyCumulative: [50000, 120000, 480000, 900000, 1200000], expenses: 350000, previous }, today)
    expect(pace.text).toBe('Llevas $ 350.000 gastados; a esta altura del mes pasado ibas en $ 480.000')
    expect(pace.spent).toBe(350000)
    expect(pace.previousAtSameDay).toBe(480000)
  })

  it('drops the comparison when the previous month has no spending', () => {
    expect(paceSummary({ daily, previousDailyCumulative: [0, 0, 0, 0, 0], expenses: 350000, previous }, today).text).toBe('Llevas $ 350.000 gastados')
    expect(paceSummary({ daily, previousDailyCumulative: [], expenses: 350000, previous }, today).text).toBe('Llevas $ 350.000 gastados')
  })

  it('uses the last day of a shorter previous month', () => {
    const pace = paceSummary({ daily: daily.slice(0, 3), previousDailyCumulative: [10000, 70000], expenses: 350000, previous }, today)
    expect(pace.text).toBe('Llevas $ 350.000 gastados; a esta altura del mes pasado ibas en $ 70.000')
  })

  it('compares whole months once the month is closed', () => {
    const closed = [day(1, 100000, 100000), day(2, 250000, 350000), day(3, 60000, 410000)]
    const pace = paceSummary({ daily: closed, previousDailyCumulative: [50000, 120000, 480000, 900000], expenses: 410000, previous }, '2026-11-15')
    expect(pace.text).toBe('Gastaste $ 410.000; en septiembre gastaste $ 900.000')
    expect(paceSummary({ daily: closed, previousDailyCumulative: [0, 0], expenses: 410000, previous }, '2026-11-15').text).toBe('Gastaste $ 410.000')
  })

  it('does not invent a pace for a month that has not started', () => {
    const future = [day(1, 0, null), day(2, 80000, null), day(3, 0, null)]
    const base = { daily: future, previousDailyCumulative: [50000, 120000, 480000], previous }
    expect(paceSummary({ ...base, expenses: 0 }, '2026-09-20')).toMatchObject({ text: 'Este mes aún no empieza', previousAtSameDay: null, previousHasData: true })
    expect(paceSummary({ ...base, expenses: 80000 }, '2026-09-20').text).toBe('Este mes aún no empieza; ya tienes $ 80.000 en gastos con fecha futura')
  })

  it('builds chart series that stop where the month has not happened yet', () => {
    const series = paceSeries({ daily, previousDailyCumulative: [1, 2, 3, 4, 5, 6] })
    expect(series.labels).toEqual(['1', '2', '3', '4', '5', '6'])
    expect(series.current).toEqual([100000, 350000, 350000, null, null, null])
    expect(series.previous).toEqual([1, 2, 3, 4, 5, 6])
  })
})

describe('category bars', () => {
  it('sorts biggest first with amount, share and bar width', () => {
    const bars = categoryBars([total(1, 'Transporte', 150000, 0.15), total(2, 'Mercado', 600000, 0.6), total(3, 'Salud', 250000, 0.25)])
    expect(bars.map((b) => b.name)).toEqual(['Mercado', 'Salud', 'Transporte'])
    expect(bars.map((b) => b.amountText)).toEqual(['$ 600.000', '$ 250.000', '$ 150.000'])
    expect(bars.map((b) => b.shareText)).toEqual(['60 %', '25 %', '15 %'])
    expect(bars.map((b) => b.ratio)).toEqual([1, 250000 / 600000, 0.25])
  })

  it('groups everything past the eighth row into "Otras"', () => {
    const amounts = [400000, 200000, 100000, 90000, 80000, 50000, 40000, 20000, 12000, 8000]
    const bars = categoryBars(amounts.map((amount, i) => total(i + 1, `Cat ${i + 1}`, amount, amount / 1_000_000)))
    expect(bars).toHaveLength(9)
    const others = bars[8]!
    expect(others.name).toBe('Otras')
    expect(others.category).toBeNull()
    expect(others.amountText).toBe('$ 20.000')
    expect(others.shareText).toBe('2 %')
    expect(bars[7]!.name).toBe('Cat 8')
  })

  it('shows a single leftover category by its name and skips empty ones', () => {
    const amounts = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
    const bars = categoryBars(amounts.map((amount, i) => total(i + 1, `Cat ${i + 1}`, amount * 1000, amount / 45)))
    expect(bars).toHaveLength(9)
    expect(bars[8]!.name).toBe('Cat 9')
  })

  it('returns nothing for a month without expenses', () => {
    expect(categoryBars([])).toEqual([])
  })
})

describe('stat card texts', () => {
  it('describes the change against the previous month by name', () => {
    expect(changeDetail(0.1, '2026-09')).toBe('+10 % vs septiembre')
    expect(changeDetail(-0.254, '2026-12')).toBe('-25 % vs diciembre')
    expect(changeDetail(null, '2026-09')).toBe('Sin datos de septiembre')
  })

  it('turns the lead figure red when it is negative', () => {
    expect(availableStat(1250000)).toEqual({ tone: 'primary', value: '$ 1.250.000', detail: 'después de fijos pendientes' })
    expect(availableStat(-319000)).toMatchObject({ tone: 'danger', value: '-$ 319.000' })
  })

  it('warns while fixed expenses are unpaid and celebrates when all are paid', () => {
    expect(fixedStat(780000, 3, 5)).toEqual({ tone: 'warning', value: '$ 780.000', detail: '3 pagos pendientes' })
    expect(fixedStat(90000, 1, 5)).toMatchObject({ detail: '1 pago pendiente' })
    expect(fixedStat(0, 0, 5)).toEqual({ tone: 'success', value: '$ 0', detail: 'Todo pagado' })
    expect(fixedStat(0, 0, 0)).toEqual({ tone: 'neutral', value: '$ 0', detail: 'Sin gastos fijos este mes' })
  })

  it('shows the savings rate only when there is income', () => {
    expect(savingsStat(900000, 0.2595)).toEqual({ tone: 'neutral', value: '$ 900.000', detail: '26 % de tus ingresos' })
    expect(savingsStat(-150000, null)).toEqual({ tone: 'danger', value: '-$ 150.000', detail: undefined })
  })
})

describe('upcoming payments', () => {
  it('writes the due date relative to today', () => {
    expect(dueText('2026-10-09', '2026-10-02')).toEqual({ text: 'Vence vie 9 oct', overdue: false })
    expect(dueText('2026-10-02', '2026-10-02')).toEqual({ text: 'Vence hoy', overdue: false })
    expect(dueText('2026-09-29', '2026-10-02')).toEqual({ text: 'Venció hace 3 días', overdue: true })
    expect(dueText('2026-10-01', '2026-10-02')).toEqual({ text: 'Venció ayer', overdue: true })
    expect(dueText(null, '2026-10-02')).toEqual({ text: 'Sin fecha', overdue: false })
  })

  it('asks for the amount of a variable fixed expense still at zero', () => {
    expect(expectedAmountText({ expectedAmount: 0, fixed: { variableAmount: true } })).toBe('Por definir')
    expect(expectedAmountText({ expectedAmount: 185000, fixed: { variableAmount: true } })).toBe('$ 185.000')
    expect(expectedAmountText({ expectedAmount: 0, fixed: { variableAmount: false } })).toBe('$ 0')
  })
})

describe('recent movements', () => {
  it('signs the amount by type', () => {
    expect(signedAmount({ type: 'income', amount: 3200000 })).toEqual({ text: '+$ 3.200.000', className: 'text-success' })
    expect(signedAmount({ type: 'expense', amount: 45000 })).toEqual({ text: '-$ 45.000', className: 'text-ink' })
    expect(signedAmount({ type: 'transfer', amount: 500000 })).toEqual({ text: '$ 500.000', className: 'text-muted' })
  })

  it('falls back from description to category name', () => {
    expect(transactionTitle({ description: 'Almuerzo', type: 'expense' }, category(1, 'Comida'))).toBe('Almuerzo')
    expect(transactionTitle({ description: '', type: 'expense' }, category(1, 'Comida'))).toBe('Comida')
    expect(transactionTitle({ description: '', type: 'transfer' }, undefined)).toBe('Transferencia')
    expect(transactionTitle({ description: ' ', type: 'expense' }, undefined)).toBe('Sin categoría')
  })
})

describe('empty month', () => {
  const empty = { income: 0, expenses: 0, pendingFixed: 0, upcomingFixed: [] }

  it('is empty only without income, expenses and fixed expenses', () => {
    expect(isEmptyMonth(empty, 0)).toBe(true)
    expect(isEmptyMonth({ ...empty, income: 1000 }, 0)).toBe(false)
    expect(isEmptyMonth({ ...empty, expenses: 1000 }, 0)).toBe(false)
    expect(isEmptyMonth({ ...empty, pendingFixed: 1000 }, 0)).toBe(false)
    expect(isEmptyMonth(empty, 2)).toBe(false)
  })

  it('marks each welcome step from the data', () => {
    expect(welcomeSteps(empty, 0).map((s) => s.done)).toEqual([false, false, false])
    expect(welcomeSteps({ ...empty, income: 5000 }, 0).map((s) => s.done)).toEqual([false, true, false])
    expect(welcomeSteps({ ...empty, expenses: 5000 }, 3).map((s) => s.done)).toEqual([true, false, true])
    expect(welcomeSteps(empty, 0).map((s) => s.title)).toEqual(['Agrega tus gastos fijos', 'Registra tu ingreso del mes', 'Registra un gasto'])
  })
})

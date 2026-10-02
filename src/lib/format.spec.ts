import { addMonths, dateShort, daysInMonth, daysUntil, formatChange, formatMoney, formatMoneyCompact, formatPercent, monthLabel, monthShort, parseMoney, todayIso } from './format'

describe('money as the owner reads it', () => {
  it('formats pesos with dots and no decimals', () => {
    expect(formatMoney(1250000)).toBe('$ 1.250.000')
    expect(formatMoney(78000)).toBe('$ 78.000')
    expect(formatMoney(0)).toBe('$ 0')
    expect(formatMoney(-319000)).toBe('-$ 319.000')
    expect(formatMoney(-0)).toBe('$ 0')
  })

  it('formats compact figures for chart axes', () => {
    expect(formatMoneyCompact(1250000)).toBe('$ 1,3 M')
    expect(formatMoneyCompact(78000)).toBe('$ 78 k')
    expect(formatMoneyCompact(500)).toBe('$ 500')
    expect(formatMoneyCompact(999_499)).toBe('$ 999,5 k')
    expect(formatMoneyCompact(999_950)).toBe('$ 1 M')
  })

  it('takes a fraction, not a percentage', () => {
    expect(formatPercent(0.2595)).toBe('26 %')
    expect(formatPercent(0.2595, 1)).toBe('26,0 %')
    expect(formatPercent(null)).toBe('—')
    expect(formatChange(0.1)).toBe('+10 %')
    expect(formatChange(-0.254)).toBe('-25 %')
    expect(formatChange(null)).toBe('—')
  })

  it('a change that rounds to zero has no sign', () => {
    expect(formatChange(0.004)).toBe('0 %')
    expect(formatChange(-0.004)).toBe('0 %')
    expect(formatChange(0)).toBe('0 %')
    expect(formatChange(0.006)).toBe('+1 %')
    expect(formatChange(-0.006)).toBe('-1 %')
  })
})

describe('parseMoney: what gets typed in', () => {
  it.each([
    ['200k', 200000],
    ['600K', 600000],
    ['1,5m', 1500000],
    ['1.5m', 1500000],
    ['514.381', 514381],
    ['1.143.415,93', 1143416],
    ['$ 78.000', 78000],
    ['500', 500],
    ['80 mil', 80000],
    ['2 millón', 2000000],
    ['0', 0],
    [' 1 500 000 ', 1500000],
    ['1.500', 1500],
    ['1.250.000', 1250000],
    // A dot that does not group by three is the decimal mark, never thousands.
    ['1.5', 2],
    ['12.5', 13],
    ['1500.50', 1501],
    ['1,5', 2],
    ['1.500k', 1500],
    // English-style grouping.
    ['1,500', 1500],
    ['1,500,000', 1500000],
    ['1,143,415.93', 1143416],
    // Still being typed.
    ['5.', 5],
    ['5,', 5],
  ])('%s -> %i', (text, expected) => {
    expect(parseMoney(text)).toBe(expected)
  })

  it('rejects what is not a number', () => {
    expect(parseMoney('')).toBeNull()
    expect(parseMoney('abc')).toBeNull()
    expect(parseMoney('12x')).toBeNull()
    expect(parseMoney('-500')).toBeNull()
    expect(parseMoney('   ')).toBeNull()
    expect(parseMoney('1.5.3')).toBeNull()
    expect(parseMoney('1.50.000')).toBeNull()
    expect(parseMoney('1,5,3')).toBeNull()
    expect(parseMoney('1.143,415.93')).toBeNull()
  })
})

describe('months and dates in local time', () => {
  it('moves across years', () => {
    expect(addMonths('2026-10', 1)).toBe('2026-11')
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
    expect(addMonths('2026-10', -12)).toBe('2025-10')
  })

  it('labels in Spanish', () => {
    expect(monthLabel('2026-10')).toBe('Octubre 2026')
    expect(monthShort('2026-10')).toBe('oct 26')
    expect(dateShort('2026-10-02')).toBe('vie 2 oct')
  })

  it('knows month lengths and distances', () => {
    expect(daysInMonth('2026-02')).toBe(28)
    expect(daysInMonth('2028-02')).toBe(29)
    expect(daysUntil('2026-10-05', '2026-10-02')).toBe(3)
    expect(daysUntil('2026-09-30', '2026-10-02')).toBe(-2)
  })

  it('uses the local day, not UTC', () => {
    // 11:30 pm on Oct 2 in Bogotá is already Oct 3 in UTC.
    expect(todayIso(new Date(2026, 9, 2, 23, 30))).toBe('2026-10-02')
  })
})

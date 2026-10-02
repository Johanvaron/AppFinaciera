import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import type { Category, CategoryReport, Month, MonthlyReportRow } from '@shared/contract'
import { api, ApiRequestError } from '@/lib/api'
import { addMonths, currentMonth } from '@/lib/format'
import ReportesView from './ReportesView.vue'

const market: Category = { id: 1, name: 'Mercado', kind: 'expense', group: 'variables', color: 'blue', archived: false }
const travel: Category = { id: 2, name: 'Viajes', kind: 'expense', group: 'variables', color: 'green', archived: false }

const monthsUntilNow = (count: number): Month[] => Array.from({ length: count }, (_, index) => addMonths(currentMonth(), index - (count - 1)))

function monthlyRows(query: { months?: number }): MonthlyReportRow[] {
  return monthsUntilNow(query.months ?? 12).map((month) => ({ month, income: 4_000_000, expenses: 1_500_000, net: 2_500_000 }))
}

/** "Viajes" was only spent on 8 months ago, so it is in the 12-month report but not in the 3-month one. */
function categoryReport(query: { from: Month; to: Month }): CategoryReport {
  const months: Month[] = []
  for (let month = query.from; month <= query.to; month = addMonths(month, 1)) months.push(month)
  const marketTotals = months.map(() => 600_000)
  const travelTotals = months.map((month) => (month === addMonths(currentMonth(), -8) ? 2_400_000 : 0))
  const rows = [{ category: market, totals: marketTotals, total: 600_000 * months.length, average: 600_000 }]
  if (travelTotals.some((value) => value > 0)) {
    rows.push({ category: travel, totals: travelTotals, total: 2_400_000, average: Math.round(2_400_000 / months.length) })
  }
  return { months, rows }
}

async function mountView() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = mount(ReportesView, {
    attachTo: document.body,
    global: {
      plugins: [createPinia(), [VueQueryPlugin, { queryClient }]],
      // Chart.js needs a real canvas; the charts are not what these tests look at.
      stubs: { IncomeExpenseChart: true, CategoryTrend: { props: ['row'], template: '<div data-test="trend">{{ row.category.name }}</div>' } },
    },
  })
  await flushPromises()
  return { wrapper, queryClient }
}

const pressOption = async (wrapper: Awaited<ReturnType<typeof mountView>>['wrapper'], label: string) => {
  await wrapper
    .findAll('button')
    .find((button) => button.text() === label)!
    .trigger('click')
  await flushPromises()
}

describe('ReportesView', () => {
  beforeEach(() => {
    vi.spyOn(api.reports, 'monthly').mockImplementation(async (query) => monthlyRows(query))
    vi.spyOn(api.reports, 'categories').mockImplementation(async (query) => categoryReport(query))
  })
  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('keeps the report on screen and says it is not current when a background refetch fails', async () => {
    const { wrapper, queryClient } = await mountView()
    expect(wrapper.text()).toContain('$ 24.000.000') // income of the 6 months
    expect(wrapper.text()).not.toContain('Reintentar')
    const down = new ApiRequestError(0, 'No se pudo conectar con el servidor local.')
    vi.mocked(api.reports.monthly).mockRejectedValue(down)
    vi.mocked(api.reports.categories).mockRejectedValue(down)
    await queryClient.refetchQueries()
    await flushPromises()
    expect(wrapper.text()).toContain('$ 24.000.000')
    expect(wrapper.text()).toContain('Mercado')
    expect(wrapper.text()).toContain('No se pudo conectar con el servidor local. Estás viendo los últimos datos cargados.')

    // The retry asks for both reports again and the notice goes away once they answer.
    vi.mocked(api.reports.monthly).mockImplementation(async (query) => monthlyRows(query))
    vi.mocked(api.reports.categories).mockImplementation(async (query) => categoryReport(query))
    const monthlyCalls = vi.mocked(api.reports.monthly).mock.calls.length
    const categoryCalls = vi.mocked(api.reports.categories).mock.calls.length
    await pressOption(wrapper, 'Reintentar')
    expect(vi.mocked(api.reports.monthly).mock.calls.length).toBe(monthlyCalls + 1)
    expect(vi.mocked(api.reports.categories).mock.calls.length).toBe(categoryCalls + 1)
    expect(wrapper.text()).toContain('$ 24.000.000')
    expect(wrapper.text()).not.toContain('No se pudo conectar')
    expect(wrapper.text()).not.toContain('Reintentar')
    wrapper.unmount()
  })

  it('says the matrix is not current when only the category report fails to refresh', async () => {
    const { wrapper, queryClient } = await mountView()
    vi.mocked(api.reports.categories).mockRejectedValue(new ApiRequestError(0, 'No se pudo conectar con el servidor local.'))
    await queryClient.refetchQueries()
    await flushPromises()
    expect(wrapper.text()).toContain('Mercado')
    expect(wrapper.text()).toContain('No se pudo conectar con el servidor local. Estás viendo los últimos datos cargados.')
    wrapper.unmount()
  })

  it('dims the totals of the previous range until the new range answers', async () => {
    const { wrapper } = await mountView()
    const summary = wrapper.find('[data-test="range-summary"]')
    expect(summary.attributes('aria-busy')).toBe('false')
    let answer: (rows: MonthlyReportRow[]) => void = () => {}
    vi.mocked(api.reports.monthly).mockImplementation(() => new Promise((resolve) => (answer = resolve)))
    await pressOption(wrapper, '3 meses')
    expect(summary.text()).toContain('$ 24.000.000') // still the 6 months
    expect(summary.attributes('aria-busy')).toBe('true')
    expect(summary.classes()).toContain('opacity-50')
    answer(monthlyRows({ months: 3 }))
    await flushPromises()
    expect(summary.attributes('aria-busy')).toBe('false')
    expect(summary.classes()).not.toContain('opacity-50')
    expect(summary.text()).toContain('$ 12.000.000')
    expect(summary.text()).not.toContain('$ 24.000.000')
    wrapper.unmount()
  })

  it('dims the open trend of the previous range until the new range answers', async () => {
    const { wrapper } = await mountView()
    await wrapper.find('button[aria-label="Ver tendencia de Mercado"]').trigger('click')
    await flushPromises()
    const trend = wrapper.find('[data-test="trend"]').element.parentElement!
    expect(trend.getAttribute('aria-busy')).toBe('false')
    let answer: (report: CategoryReport) => void = () => {}
    vi.mocked(api.reports.categories).mockImplementation(() => new Promise((resolve) => (answer = resolve)))
    await pressOption(wrapper, '12 meses')
    expect(trend.textContent).toBe('Mercado') // still the trend of the 6 months
    expect(trend.getAttribute('aria-busy')).toBe('true')
    expect(trend.classList.contains('opacity-50')).toBe(true)
    const to = currentMonth()
    answer(categoryReport({ from: addMonths(to, -11), to }))
    await flushPromises()
    expect(trend.getAttribute('aria-busy')).toBe('false')
    expect(trend.classList.contains('opacity-50')).toBe(false)
    wrapper.unmount()
  })

  it('scrolls the trend into view when a category is chosen', async () => {
    const scrollIntoView = vi.fn()
    vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(scrollIntoView)
    const { wrapper } = await mountView()
    await wrapper.find('button[aria-label="Ver tendencia de Mercado"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-test="trend"]').text()).toBe('Mercado')
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' })
    wrapper.unmount()
  })

  it('lets go of the open trend when its category is not in the new range', async () => {
    const { wrapper } = await mountView()
    await pressOption(wrapper, '12 meses')
    await wrapper.find('button[aria-label="Ver tendencia de Viajes"]').trigger('click')
    expect(wrapper.find('[data-test="trend"]').text()).toBe('Viajes')
    await pressOption(wrapper, '3 meses')
    expect(wrapper.find('[data-test="trend"]').exists()).toBe(false)
    // Back in the range that has the category: the trend stays closed until it is chosen again.
    await pressOption(wrapper, '12 meses')
    expect(wrapper.text()).toContain('Viajes')
    expect(wrapper.find('[data-test="trend"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('shows the error with a retry when there is nothing cached to show', async () => {
    vi.mocked(api.reports.monthly).mockRejectedValue(new ApiRequestError(0, 'No se pudo conectar con el servidor local.'))
    const { wrapper } = await mountView()
    expect(wrapper.text()).toContain('No se pudo conectar con el servidor local.')
    expect(wrapper.text()).toContain('Reintentar')
    wrapper.unmount()
  })
})

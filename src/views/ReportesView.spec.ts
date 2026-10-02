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

  it('keeps the report on screen when a background refetch fails', async () => {
    const { wrapper, queryClient } = await mountView()
    expect(wrapper.text()).toContain('$ 24.000.000') // income of the 6 months
    const down = new ApiRequestError(0, 'No se pudo conectar con el servidor local.')
    vi.mocked(api.reports.monthly).mockRejectedValue(down)
    vi.mocked(api.reports.categories).mockRejectedValue(down)
    await queryClient.refetchQueries()
    await flushPromises()
    expect(wrapper.text()).toContain('$ 24.000.000')
    expect(wrapper.text()).toContain('Mercado')
    expect(wrapper.text()).not.toContain('No se pudo conectar')
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

<script setup lang="ts">
/** Running total of the month's spending against the previous month's line. */
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import { CategoryScale, Chart as ChartJS, LinearScale, LineElement, PointElement, Tooltip, type ChartData, type ChartOptions } from 'chart.js'
import type { MonthSummary } from '@shared/contract'
import ChartBox from '@/components/ui/ChartBox.vue'
import { formatMoney, formatMoneyCompact } from '@/lib/format'
import { tokenColor } from '@/lib/palette'
import { useThemeStore } from '@/stores/theme'
import CardHeader from './CardHeader.vue'
import { monthNameLower, paceSeries, paceSummary } from './summary'

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip)

const props = defineProps<{ summary: MonthSummary }>()
const theme = useThemeStore()

const pace = computed(() => paceSummary(props.summary))
const series = computed(() => paceSeries(props.summary))
const previousName = computed(() => monthNameLower(props.summary.previous.month))
const hasPrevious = computed(() => pace.value.previousHasData)

/** Token colors are read from CSS, so they are recomputed when the theme flips. */
const colors = computed(() => {
  void theme.isDark
  return { primary: tokenColor('primary'), muted: tokenColor('muted'), fill: tokenColor('fill'), surface: tokenColor('surface'), ink: tokenColor('ink') }
})

const chartData = computed<ChartData<'line', (number | null)[], string>>(() => {
  const datasets: ChartData<'line', (number | null)[], string>['datasets'] = [
    {
      label: 'Este mes',
      data: series.value.current,
      borderColor: colors.value.primary,
      backgroundColor: colors.value.primary,
      borderWidth: 2.5,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.2,
      order: 1,
    },
  ]
  if (hasPrevious.value) {
    datasets.push({
      label: 'Mes anterior',
      data: series.value.previous,
      borderColor: colors.value.muted,
      backgroundColor: colors.value.muted,
      borderWidth: 1.5,
      borderDash: [5, 5],
      pointRadius: 0,
      pointHoverRadius: 3,
      tension: 0.2,
      order: 2,
    })
  }
  return { labels: series.value.labels, datasets }
})

const chartOptions = computed<ChartOptions<'line'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    tooltip: {
      backgroundColor: colors.value.ink,
      titleColor: colors.value.surface,
      bodyColor: colors.value.surface,
      callbacks: {
        title: (items) => `Día ${items[0]?.label ?? ''}`,
        label: (item) => `${item.dataset.label}: ${formatMoney(item.parsed.y ?? 0)}`,
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { color: colors.value.muted, font: { size: 13 }, maxRotation: 0, autoSkipPadding: 12 },
    },
    y: {
      beginAtZero: true,
      grid: { color: colors.value.fill },
      border: { display: false },
      ticks: { color: colors.value.muted, font: { size: 13 }, maxTicksLimit: 6, callback: (value) => formatMoneyCompact(Number(value)) },
    },
  },
}))
</script>

<template>
  <section class="card flex min-w-0 flex-col gap-3">
    <CardHeader title="Ritmo de gasto" />
    <p class="text-[14px] text-muted">{{ pace.text }}</p>
    <ChartBox size="md">
      <Line :data="chartData" :options="chartOptions" aria-label="Gasto acumulado por día del mes" role="img" />
    </ChartBox>
    <ul class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      <li class="flex items-center gap-1.5">
        <span class="h-0.5 w-5 rounded-full bg-primary" aria-hidden="true" />
        Este mes
      </li>
      <li v-if="hasPrevious" class="flex items-center gap-1.5">
        <span class="w-5 border-t-2 border-dashed border-muted" aria-hidden="true" />
        Mes anterior ({{ previousName }})
      </li>
    </ul>
  </section>
</template>

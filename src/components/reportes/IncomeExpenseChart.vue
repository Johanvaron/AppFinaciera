<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import type { MonthlyReportRow } from '@shared/contract'
import ChartBox from '@/components/ui/ChartBox.vue'
import { formatMoney, formatMoneyCompact, monthShort } from '@/lib/format'
import { useChartColors } from './chartTheme'

Chart.register(BarController, BarElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend)

const props = defineProps<{ rows: MonthlyReportRow[] }>()
const colors = useChartColors()

// Bars for income/expenses with the net as a line on top (mixed chart).
const data = computed(() => {
  const c = colors.value
  return {
    labels: props.rows.map((row) => monthShort(row.month)),
    datasets: [
      {
        type: 'line',
        label: 'Neto',
        data: props.rows.map((row) => row.net),
        borderColor: c.ink,
        backgroundColor: c.ink,
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        tension: 0.25,
        order: 0,
      },
      {
        label: 'Ingresos',
        data: props.rows.map((row) => row.income),
        backgroundColor: c.success,
        borderRadius: 4,
        maxBarThickness: 36,
        order: 1,
      },
      {
        label: 'Gastos',
        data: props.rows.map((row) => row.expenses),
        backgroundColor: c.primary,
        borderRadius: 4,
        maxBarThickness: 36,
        order: 1,
      },
    ],
  } as unknown as ChartData<'bar'>
})

const options = computed<ChartOptions<'bar'>>(() => {
  const c = colors.value
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top', align: 'end', labels: { color: c.muted, boxWidth: 12, boxHeight: 12, font: { size: 13 } } },
      tooltip: { callbacks: { label: (item) => `${item.dataset.label}: ${formatMoney(Number(item.parsed.y))}` } },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: c.muted, font: { size: 13 } } },
      y: {
        grid: { color: c.grid },
        border: { display: false },
        ticks: { color: c.muted, font: { size: 13 }, callback: (value) => formatMoneyCompact(Number(value)) },
      },
    },
  }
})
</script>

<template>
  <section class="card flex min-w-0 flex-col gap-3">
    <h2 class="font-semibold">Ingresos vs gastos</h2>
    <ChartBox size="lg">
      <Bar :data="data" :options="options" aria-label="Ingresos, gastos y neto por mes" role="img" />
    </ChartBox>
  </section>
</template>

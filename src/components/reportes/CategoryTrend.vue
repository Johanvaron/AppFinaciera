<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
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
import { X } from 'lucide-vue-next'
import type { CategoryReportRow, Month } from '@shared/contract'
import ChartBox from '@/components/ui/ChartBox.vue'
import UiButton from '@/components/ui/UiButton.vue'
import { formatMoney, formatMoneyCompact, monthShort } from '@/lib/format'
import { categoryHex } from '@/lib/palette'
import { useChartColors } from './chartTheme'

Chart.register(LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend)

const props = defineProps<{ row: CategoryReportRow; months: Month[] }>()
defineEmits<{ close: [] }>()

const colors = useChartColors()

const data = computed<ChartData<'line'>>(() => {
  const hex = categoryHex(props.row.category.color)
  return {
    labels: props.months.map(monthShort),
    datasets: [
      { label: props.row.category.name, data: props.row.totals, borderColor: hex, backgroundColor: hex, borderWidth: 2, pointRadius: 3, tension: 0.25 },
      {
        label: 'Promedio',
        data: props.months.map(() => props.row.average),
        borderColor: colors.value.muted,
        backgroundColor: colors.value.muted,
        borderWidth: 1.5,
        borderDash: [6, 4],
        pointRadius: 0,
        pointHoverRadius: 0,
      },
    ],
  }
})

const options = computed<ChartOptions<'line'>>(() => {
  const c = colors.value
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top', align: 'end', labels: { color: c.muted, boxWidth: 12, boxHeight: 2, font: { size: 13 } } },
      tooltip: { callbacks: { label: (item) => `${item.dataset.label}: ${formatMoney(Number(item.parsed.y))}` } },
    },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: c.muted, font: { size: 13 } } },
      y: {
        beginAtZero: true,
        grid: { color: c.grid },
        border: { display: false },
        ticks: { color: c.muted, font: { size: 13 }, maxTicksLimit: 5, callback: (value) => formatMoneyCompact(Number(value)) },
      },
    },
  }
})
</script>

<template>
  <section class="card flex min-w-0 flex-col gap-3">
    <div class="flex min-w-0 items-center gap-2">
      <span class="size-2.5 shrink-0 rounded-full" :style="{ backgroundColor: categoryHex(row.category.color) }" aria-hidden="true" />
      <h2 class="min-w-0 flex-1 truncate font-semibold">Tendencia de {{ row.category.name }}</h2>
      <p class="num hidden text-xs text-muted sm:block">Promedio {{ formatMoney(row.average) }}</p>
      <UiButton variant="ghost" icon aria-label="Cerrar tendencia" @click="$emit('close')">
        <X class="size-4" aria-hidden="true" />
      </UiButton>
    </div>
    <ChartBox size="sm">
      <Line :data="data" :options="options" :aria-label="`Tendencia mensual de ${row.category.name}`" role="img" />
    </ChartBox>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CalendarRange, Flame, PiggyBank, TrendingDown, TrendingUp } from 'lucide-vue-next'
import type { MonthlyReportRow } from '@shared/contract'
import StatCard from '@/components/ui/StatCard.vue'
import { formatMoney } from '@/lib/format'
import { averageDetailText, cellText, peakAmountText, peakMonthText, rangeTotals } from './reports'

const props = defineProps<{ rows: MonthlyReportRow[] }>()

const totals = computed(() => rangeTotals(props.rows))
</script>

<template>
  <!-- Fixed columns so no card is left alone in a row: 1, then 2+2+1, then 3+2 (six tracks), then 5 in a row. -->
  <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-6 2xl:grid-cols-5" aria-label="Cifras del rango">
    <StatCard class="md:col-span-2 2xl:col-span-1" label="Ingresos totales" :value="formatMoney(totals.income)" :icon="TrendingUp" tone="success" />
    <StatCard class="md:col-span-2 2xl:col-span-1" label="Gastos totales" :value="formatMoney(totals.expenses)" :icon="TrendingDown" />
    <StatCard
      class="md:col-span-2 2xl:col-span-1"
      label="Ahorro neto"
      :value="formatMoney(totals.net)"
      :icon="PiggyBank"
      :tone="totals.net < 0 ? 'danger' : 'primary'"
    />
    <StatCard
      class="md:col-span-3 2xl:col-span-1"
      label="Gasto promedio mensual"
      :value="cellText(totals.averageExpense)"
      :icon="CalendarRange"
      :detail="averageDetailText(rows.length)"
    />
    <StatCard
      class="sm:col-span-2 md:col-span-3 2xl:col-span-1"
      label="Mes de mayor gasto"
      :value="peakAmountText(totals)"
      :detail="peakMonthText(totals)"
      :icon="Flame"
    />
  </section>
</template>

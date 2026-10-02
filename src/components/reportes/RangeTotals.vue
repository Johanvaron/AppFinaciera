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
  <section class="grid grid-cols-1 gap-4 sm:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]" aria-label="Cifras del rango">
    <StatCard label="Ingresos totales" :value="formatMoney(totals.income)" :icon="TrendingUp" tone="success" />
    <StatCard label="Gastos totales" :value="formatMoney(totals.expenses)" :icon="TrendingDown" />
    <StatCard label="Ahorro neto" :value="formatMoney(totals.net)" :icon="PiggyBank" :tone="totals.net < 0 ? 'danger' : 'primary'" />
    <StatCard label="Gasto promedio mensual" :value="cellText(totals.averageExpense)" :icon="CalendarRange" :detail="averageDetailText(rows.length)" />
    <StatCard
      label="Mes de mayor gasto"
      :value="peakAmountText(totals)"
      :detail="peakMonthText(totals)"
      :icon="Flame"
    />
  </section>
</template>

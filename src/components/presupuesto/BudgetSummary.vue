<script setup lang="ts">
/** Figures of the month, or a short guide while no category has a cap yet. */
import { computed } from 'vue'
import { Lightbulb, ReceiptText, Scale, Target } from 'lucide-vue-next'
import type { BudgetMonthResponse } from '@shared/contract'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import StatCard from '@/components/ui/StatCard.vue'
import { formatMoney, formatPercent } from '@/lib/format'
import { hasAnyBudget, overallRatio, ratioState, spentDetail, stateTone } from './budget'

const props = defineProps<{ data: BudgetMonthResponse }>()

const budgeted = computed(() => hasAnyBudget(props.data.rows))
const totals = computed(() => props.data.totals)
const over = computed(() => totals.value.remaining < 0)
const ratio = computed(() => overallRatio(totals.value))
</script>

<template>
  <div v-if="budgeted" class="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <StatCard label="Presupuestado" :value="formatMoney(totals.budget)" :icon="Target" tone="primary" />
    <StatCard label="Gastado en el mes" :value="formatMoney(totals.spent)" :icon="ReceiptText" :detail="spentDetail(totals)" />
    <StatCard
      :label="over ? 'Te pasaste por' : 'Disponible'"
      :value="formatMoney(Math.abs(totals.remaining))"
      :icon="Scale"
      :tone="over ? 'danger' : 'success'"
    />
    <div class="card flex min-w-0 flex-col justify-center gap-2">
      <div class="flex items-baseline justify-between gap-3">
        <p class="truncate text-xs font-medium text-muted">Uso del presupuesto</p>
        <p class="num text-[20px] font-semibold leading-tight">{{ formatPercent(ratio) }}</p>
      </div>
      <ProgressBar :ratio="ratio" :tone="stateTone(ratioState(ratio))" label="Gastado en categorías con tope sobre lo presupuestado" />
    </div>
  </div>

  <div v-else class="flex min-w-0 items-center gap-3 rounded-card bg-primary-soft p-4">
    <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-ink">
      <Lightbulb class="size-5" aria-hidden="true" />
    </span>
    <div class="min-w-0">
      <p class="font-medium">Ponle un tope a las categorías donde quieras controlar el gasto</p>
      <p class="text-xs text-muted">
        Este mes llevas gastado <span class="num font-medium text-ink">{{ formatMoney(totals.spent) }}</span
        >. Toca "Poner tope" en una categoría para empezar.
      </p>
    </div>
  </div>
</template>

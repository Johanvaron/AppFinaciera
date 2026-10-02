<script setup lang="ts">
/** The four figures of the month above the checklist. */
import { computed } from 'vue'
import { CircleCheck, Hourglass, ListChecks, Wallet } from 'lucide-vue-next'
import type { FixedMonthResponse } from '@shared/contract'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import StatCard from '@/components/ui/StatCard.vue'
import { formatMoney } from '@/lib/format'
import { progressRatio, progressText } from './fixed'

const props = defineProps<{ totals: FixedMonthResponse['totals'] }>()

const progress = computed(() => progressText(props.totals.countPaid, props.totals.countTotal))
const ratio = computed(() => progressRatio(props.totals.countPaid, props.totals.countTotal))
const done = computed(() => props.totals.countTotal > 0 && props.totals.countPaid === props.totals.countTotal)
</script>

<template>
  <section class="grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 xl:grid-cols-4" aria-label="Cifras del mes">
    <StatCard label="Total del mes" :value="formatMoney(totals.expected)" :icon="Wallet" />
    <StatCard label="Pagado" :value="formatMoney(totals.paid)" :icon="CircleCheck" tone="success" />
    <StatCard label="Falta por pagar" :value="formatMoney(totals.pending)" :icon="Hourglass" :tone="totals.pending > 0 ? 'warning' : 'neutral'" />
    <!-- Same shape as StatCard, plus the bar (StatCard has no slot for it). -->
    <div class="flex min-w-0 items-center gap-3 rounded-card bg-surface p-4 shadow-card">
      <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-fill text-muted">
        <ListChecks class="size-5" aria-hidden="true" />
      </span>
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <p class="truncate text-xs font-medium text-muted">Avance</p>
        <p class="num truncate text-[20px] font-semibold leading-tight">{{ progress }} <span class="text-xs font-medium text-muted">pagados</span></p>
        <ProgressBar :ratio="ratio" :tone="done ? 'success' : 'primary'" :label="`Gastos fijos pagados: ${progress}`" />
      </div>
    </div>
  </section>
</template>

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
    <StatCard label="Avance" :value="`${progress} pagados`" :icon="ListChecks">
      <ProgressBar class="mt-1.5" :ratio="ratio" :tone="done ? 'success' : 'primary'" :label="`Gastos fijos pagados: ${progress}`" />
    </StatCard>
  </section>
</template>

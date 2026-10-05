<script setup lang="ts">
/** The three figures at the top: total owed, paid this calendar month, active count. */
import { computed } from 'vue'
import { CreditCard, HandCoins, Layers } from 'lucide-vue-next'
import StatCard from '@/components/ui/StatCard.vue'
import type { Debt } from '@shared/contract'
import { formatMoney } from '@/lib/format'
import { headlineTotal } from './debts'

const props = defineProps<{ debts: Debt[]; paidThisMonth: number; activeCount: number }>()

const total = computed(() => headlineTotal(props.debts))
const countText = computed(() => (props.activeCount === 1 ? '1 deuda' : `${props.activeCount} deudas`))
</script>

<template>
  <div class="grid grid-cols-1 gap-4 min-[520px]:grid-cols-3">
    <StatCard label="Debes en total" :value="total.value" :icon="CreditCard" :tone="total.tone" large />
    <StatCard label="Pagado este mes" :value="formatMoney(paidThisMonth)" :icon="HandCoins" tone="success" />
    <StatCard label="Deudas activas" :value="countText" :icon="Layers" />
  </div>
</template>

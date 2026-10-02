<script setup lang="ts">
/** Unpaid fixed expenses, soonest first. */
import { computed } from 'vue'
import { CircleCheck } from 'lucide-vue-next'
import type { FixedMonthItem } from '@shared/contract'
import CardHeader from './CardHeader.vue'
import { dueText, upcomingAmount } from './summary'

const MAX_ROWS = 6
const props = defineProps<{ items: FixedMonthItem[] }>()

const rows = computed(() =>
  props.items.slice(0, MAX_ROWS).map((item) => ({
    id: item.fixed.id,
    name: item.fixed.name,
    due: dueText(item.dueDate),
    amount: upcomingAmount(item),
  })),
)
const linkLabel = computed(() => (props.items.length > MAX_ROWS ? `Ver todos (${props.items.length})` : 'Ver todos'))
</script>

<template>
  <section class="card flex min-w-0 flex-col gap-3">
    <CardHeader title="Próximos pagos" to="/fijos" :link-label="linkLabel" />
    <ul v-if="rows.length" class="flex flex-col">
      <li v-for="row in rows" :key="row.id" class="flex min-w-0 items-center justify-between gap-3 py-2">
        <div class="min-w-0">
          <p class="truncate text-[14px] font-medium">{{ row.name }}</p>
          <p :class="['truncate text-xs', row.due.overdue ? 'font-medium text-danger' : 'text-muted']">{{ row.due.text }}</p>
          <p v-if="row.amount.paidNote" class="num text-xs text-muted">{{ row.amount.paidNote }}</p>
        </div>
        <span :class="['num shrink-0 text-[14px]', row.amount.toDefine ? 'text-muted' : 'font-semibold']">{{ row.amount.text }}</span>
      </li>
    </ul>
    <div v-else class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
      <span class="flex size-10 items-center justify-center rounded-full bg-success-soft text-success">
        <CircleCheck class="size-5" aria-hidden="true" />
      </span>
      <p class="text-[14px] text-muted">No tienes pagos pendientes este mes</p>
    </div>
  </section>
</template>

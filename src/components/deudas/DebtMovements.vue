<script setup lang="ts">
/**
 * History of a debt, newest first. A line that comes from the linked fixed
 * expense is marked and cannot be deleted here (it is a normal transaction).
 */
import { Trash2 } from 'lucide-vue-next'
import type { DebtMovement } from '@shared/contract'
import UiBadge from '@/components/ui/UiBadge.vue'
import { dateShort, formatMoney } from '@/lib/format'
import { movementAmountText, movementText, movementTone } from './debts'

defineProps<{ movements: DebtMovement[]; deleting: number | null }>()
const emit = defineEmits<{ remove: [movement: DebtMovement] }>()

const TONE_TEXT = { success: 'text-success', warning: 'text-warning', danger: 'text-danger', neutral: 'text-ink' }
const rowKey = (m: DebtMovement, index: number) => (m.entryId != null ? `e${m.entryId}` : m.transactionId != null ? `t${m.transactionId}` : `i${index}`)
</script>

<template>
  <section class="min-w-0">
    <h3 class="text-xs font-semibold text-muted">Movimientos</h3>
    <p v-if="movements.length === 0" class="py-3 text-xs text-muted">Todavía no hay cargos ni pagos desde que empezó la deuda.</p>
    <ul v-else class="mt-1 flex flex-col">
      <li v-for="(movement, index) in movements" :key="rowKey(movement, index)" class="flex items-center gap-2 py-2 [&+li]:shadow-[inset_0_1px_0_rgb(var(--fill))]">
        <div class="min-w-0 flex-1">
          <div class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span class="truncate text-[14px]">{{ movementText(movement) }}</span>
            <UiBadge :tone="movementTone(movement.type)">{{ movement.type === 'cargo' ? 'Cargo' : 'Abono' }}</UiBadge>
          </div>
          <p class="text-xs text-muted">
            {{ dateShort(movement.date) }}<template v-if="movement.source === 'payment'"> · Pago del gasto fijo</template>
          </p>
        </div>
        <div class="shrink-0 text-right">
          <p :class="['num text-[14px] font-semibold', TONE_TEXT[movementTone(movement.type)]]">{{ movementAmountText(movement) }}</p>
          <p class="num text-xs text-muted">Queda {{ formatMoney(movement.balanceAfter) }}</p>
        </div>
        <!-- A payment of the fixed expense keeps the space so the figures stay aligned. -->
        <button
          v-if="movement.source === 'entry' && movement.entryId != null"
          type="button"
          class="flex size-10 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-60 sm:size-8"
          :aria-label="`Eliminar ${movementText(movement)} del ${dateShort(movement.date)}`"
          :disabled="deleting === movement.entryId"
          @click="emit('remove', movement)"
        >
          <Trash2 class="size-4" aria-hidden="true" />
        </button>
        <span v-else class="size-10 shrink-0 sm:size-8" aria-hidden="true" />
      </li>
    </ul>
  </section>
</template>

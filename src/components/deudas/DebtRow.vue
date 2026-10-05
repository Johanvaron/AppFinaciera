<script setup lang="ts">
/**
 * One debt in the list. The name is the button that opens the detail (keyboard
 * path); a click anywhere on the content does the same for the mouse. The menu
 * at the right holds the edits. On a phone the figure goes under the name.
 */
import { computed } from 'vue'
import { Archive, ArchiveRestore, Pencil, Trash2, HandCoins } from 'lucide-vue-next'
import { DEBT_KIND_LABELS, type Debt } from '@shared/contract'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import RowMenu, { type MenuItem } from '@/components/fijos/RowMenu.vue'
import { TONE_TEXT, balanceText, lastPaymentText, linkText, paidThisMonthText, progressRatio } from './debts'

export type RowAction = 'pay' | 'edit' | 'archive' | 'remove'

const props = defineProps<{
  debt: Debt
  /** Name of the linked fixed expense in the current month, if it is there. */
  fixedName: string | undefined
}>()
const emit = defineEmits<{ open: []; action: [action: RowAction] }>()

const balance = computed(() => balanceText(props.debt))
const link = computed(() => linkText(props.debt.fixedExpenseId, props.fixedName))
const lastPayment = computed(() => lastPaymentText(props.debt))
const ratio = computed(() => progressRatio(props.debt))

const menu = computed<MenuItem[]>(() => [
  { key: 'pay', label: 'Abonar', icon: HandCoins },
  { key: 'edit', label: 'Editar', icon: Pencil },
  props.debt.archived
    ? { key: 'archive', label: 'Restaurar', icon: ArchiveRestore }
    : { key: 'archive', label: 'Archivar', icon: Archive },
  { key: 'remove', label: 'Eliminar', icon: Trash2, danger: true },
])
</script>

<template>
  <li class="flex items-start gap-2 py-3 sm:items-center">
    <!-- The button's click bubbles here, so a keyboard Enter and a mouse click open the detail once each. -->
    <div class="flex min-w-0 flex-1 cursor-pointer flex-col gap-2 sm:flex-row sm:items-center sm:gap-4" @click="emit('open')">
      <div class="min-w-0 flex-1">
        <div class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <button type="button" class="min-w-0 truncate rounded text-left font-medium hover:text-primary" :aria-label="`Ver detalle de ${debt.name}`">
            {{ debt.name }}
          </button>
          <UiBadge>{{ DEBT_KIND_LABELS[debt.kind] }}</UiBadge>
          <UiBadge v-if="debt.archived">Archivada</UiBadge>
        </div>
        <p class="mt-0.5 text-xs text-muted">
          {{ paidThisMonthText(debt) }}<template v-if="lastPayment"> · {{ lastPayment }}</template>
        </p>
        <p v-if="link" class="text-xs text-muted">{{ link }}</p>
        <ProgressBar class="mt-2 max-w-md" :ratio="ratio" tone="success" :label="`Pagado de ${debt.name}`" />
      </div>
      <p :class="['num shrink-0 text-[18px] font-semibold leading-tight sm:text-right', TONE_TEXT[balance.tone]]">{{ balance.text }}</p>
    </div>
    <RowMenu :label="`Acciones de ${debt.name}`" :items="menu" @select="emit('action', $event as RowAction)" />
  </li>
</template>

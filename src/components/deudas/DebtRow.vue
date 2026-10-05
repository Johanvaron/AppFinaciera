<script setup lang="ts">
/**
 * One debt in the list. The whole row opens the detail; the menu at the right
 * holds the edits. On a phone the figure goes under the name (two lines).
 */
import { computed } from 'vue'
import { Archive, ArchiveRestore, Pencil, Trash2 } from 'lucide-vue-next'
import { DEBT_KIND_LABELS, type Debt } from '@shared/contract'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import RowMenu, { type MenuItem } from '@/components/fijos/RowMenu.vue'
import { balanceText, lastPaymentText, linkText, paidThisMonthText, progressRatio } from './debts'

export type RowAction = 'edit' | 'archive' | 'remove'

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
  { key: 'edit', label: 'Editar', icon: Pencil },
  props.debt.archived
    ? { key: 'archive', label: 'Restaurar', icon: ArchiveRestore }
    : { key: 'archive', label: 'Archivar', icon: Archive },
  { key: 'remove', label: 'Eliminar', icon: Trash2, danger: true },
])

const TONE_TEXT = { success: 'text-success', danger: 'text-danger', warning: 'text-warning', neutral: 'text-ink' }
</script>

<template>
  <li class="flex items-start gap-2 py-3 sm:items-center">
    <button
      type="button"
      class="flex min-w-0 flex-1 flex-col gap-2 rounded-lg text-left hover:bg-fill/60 focus-visible:bg-fill/60 sm:flex-row sm:items-center sm:gap-4"
      :aria-label="`Ver detalle de ${debt.name}`"
      @click="emit('open')"
    >
      <div class="min-w-0 flex-1">
        <div class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span class="truncate font-medium">{{ debt.name }}</span>
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
    </button>
    <RowMenu :label="`Acciones de ${debt.name}`" :items="menu" @select="emit('action', $event as RowAction)" />
  </li>
</template>

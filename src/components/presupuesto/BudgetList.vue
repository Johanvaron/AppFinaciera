<script setup lang="ts">
/**
 * The whole budget in one surface: a section per group with its subtotal and
 * one row per category. Owns the in-place editing (which row is open, saving,
 * Tab to the next cap).
 */
import { computed, nextTick, reactive, ref, watch } from 'vue'
import type { BudgetInput, BudgetRow } from '@shared/contract'
import { api } from '@/lib/api'
import { useApiMutation } from '@/lib/queries'
import { useToasts } from '@/lib/toasts'
import { usePeriodStore } from '@/stores/period'
import BudgetRowItem from './BudgetRowItem.vue'
import { groupRows, groupSubtotalText, groupUncappedText, neighborId, resolveBudgetEdit, type CommitVia } from './budget'
import { BUDGET_GRID } from './layout'

const props = defineProps<{ rows: BudgetRow[] }>()

const period = usePeriodStore()
const toasts = useToasts()
const setBudget = useApiMutation((input: BudgetInput) => api.budgets.set(input))

const root = ref<HTMLElement>()
const editingId = ref<number | null>(null)
const invalidId = ref<number | null>(null)
/** Row order kept while caps are being filled, so rows do not jump after each save. */
const frozenOrder = ref<number[] | null>(null)
/** Caps on their way to the server, shown in place until fresh data arrives. */
const pending = reactive(new Map<number, number | null>())

const groups = computed(() => groupRows(props.rows, frozenOrder.value))
const orderedIds = computed(() => groups.value.flatMap((group) => group.rows.map((row) => row.category.id)))

function startEditing(id: number) {
  frozenOrder.value ??= orderedIds.value
  invalidId.value = null
  editingId.value = id
}

async function focusTrigger(id: number) {
  await nextTick()
  root.value?.querySelector<HTMLElement>(`[data-budget-trigger="${id}"]`)?.focus()
}

function cancel(id: number) {
  if (editingId.value !== id) return
  editingId.value = null
  invalidId.value = null
  void focusTrigger(id)
}

async function save(input: BudgetInput) {
  pending.set(input.categoryId, input.amount)
  try {
    await setBudget.mutateAsync(input)
  } catch {
    // useApiMutation already showed the error toast; the row goes back to the server value.
  } finally {
    pending.delete(input.categoryId)
  }
}

function commit(row: BudgetRow, text: string, via: CommitVia) {
  const id = row.category.id
  // Closing the input also fires a blur: only the row being edited may commit.
  if (editingId.value !== id) return
  const edit = resolveBudgetEdit(row.budget, text, id, period.month)

  if (edit.kind === 'invalid') {
    if (via === 'blur') {
      editingId.value = null
      invalidId.value = null
      toasts.error('Ese monto no es válido. Escribe algo como 500.000 o 500k.')
    } else {
      invalidId.value = id
    }
    return
  }

  invalidId.value = null
  const nextId = via === 'next' ? neighborId(orderedIds.value, id, 1) : via === 'previous' ? neighborId(orderedIds.value, id, -1) : null
  editingId.value = nextId
  if (nextId == null && via !== 'blur') void focusTrigger(id)
  if (edit.kind === 'save') void save(edit.input)
}

/** Once the person is done (focus left the list), rows go back to their natural order. */
function onFocusOut(event: FocusEvent) {
  if (editingId.value != null) return
  const next = event.relatedTarget as Node | null
  if (!next || !root.value?.contains(next)) frozenOrder.value = null
}

watch(
  () => period.month,
  () => {
    editingId.value = null
    invalidId.value = null
    frozenOrder.value = null
  },
)
</script>

<template>
  <section ref="root" class="card flex min-w-0 flex-col gap-3" aria-label="Presupuesto por categoría" @focusout="onFocusOut">
    <p class="text-xs text-muted">
      El tope que pongas en un mes sigue vigente los meses siguientes hasta que lo cambies. Deja el campo vacío para quitarlo.
    </p>

    <div :class="[BUDGET_GRID, 'hidden text-xs font-medium text-muted sm:grid']" aria-hidden="true">
      <span>Categoría</span>
      <span>Avance</span>
      <span class="text-right">%</span>
      <span class="text-right">Gastado</span>
      <span class="text-right">Tope</span>
    </div>

    <div v-for="group in groups" :key="group.group" class="flex min-w-0 flex-col gap-1">
      <div class="flex min-h-10 min-w-0 flex-wrap items-center justify-between gap-x-3 rounded-lg bg-fill px-3 py-1.5">
        <h2 class="text-[14px] font-semibold">{{ group.label }}</h2>
        <p class="flex min-w-0 flex-wrap justify-end gap-x-2 text-xs text-muted">
          <span class="num">{{ groupSubtotalText(group) }}</span>
          <span v-if="groupUncappedText(group)" class="num">{{ groupUncappedText(group) }}</span>
        </p>
      </div>
      <ul class="flex min-w-0 flex-col">
        <BudgetRowItem
          v-for="row in group.rows"
          :key="row.category.id"
          :row="row"
          :editing="editingId === row.category.id"
          :invalid="invalidId === row.category.id"
          :pending="pending.get(row.category.id)"
          @start="startEditing(row.category.id)"
          @cancel="cancel(row.category.id)"
          @commit="(text, via) => commit(row, text, via)"
        />
      </ul>
    </div>
  </section>
</template>

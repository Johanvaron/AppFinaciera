<script setup lang="ts">
/**
 * One category of the budget. Phone: name + cap, then the bar, then status +
 * spent. Desktop: a single line of columns (see BUDGET_GRID) with the status
 * under the bar (it may run under the % column). The cap is edited in place.
 */
import { computed, nextTick, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import type { BudgetRow } from '@shared/contract'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import UiMoneyInput from '@/components/ui/UiMoneyInput.vue'
import { formatMoney, formatPercent } from '@/lib/format'
import { categoryHex } from '@/lib/palette'
import { barRatio, isOver, stateTone, statusText, type CommitVia } from './budget'
import { BUDGET_GRID } from './layout'

const props = defineProps<{
  row: BudgetRow
  editing: boolean
  invalid: boolean
  /** Cap being saved right now (undefined = nothing in flight). */
  pending?: number | null
}>()

const emit = defineEmits<{
  start: []
  cancel: []
  commit: [text: string, via: CommitVia]
}>()

const draft = ref<number | null>(null)
const input = ref<InstanceType<typeof UiMoneyInput>>()

const saving = computed(() => props.pending !== undefined)
const shownBudget = computed(() => (props.pending !== undefined ? props.pending : props.row.budget))
const name = computed(() => props.row.category.name)

watch(
  () => props.editing,
  async (isEditing) => {
    if (!isEditing) return
    draft.value = props.row.budget
    await nextTick()
    input.value?.focus()
    input.value?.select()
  },
  { immediate: true },
)

const typedText = (event: Event) => (event.target as HTMLInputElement).value

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
    emit('commit', typedText(event), 'enter')
  } else if (event.key === 'Escape') {
    event.preventDefault()
    emit('cancel')
  } else if (event.key === 'Tab') {
    // Tab walks the caps so the whole month can be filled in one go.
    event.preventDefault()
    emit('commit', typedText(event), event.shiftKey ? 'previous' : 'next')
  }
}
</script>

<template>
  <li :class="[BUDGET_GRID, 'items-center gap-y-1.5 rounded-lg py-2.5 hover:bg-fill/50 sm:gap-y-0.5 sm:py-2']">
    <div class="col-start-1 row-start-1 flex min-w-0 items-center gap-2 sm:row-span-2">
      <span class="size-2.5 shrink-0 rounded-full" :style="{ backgroundColor: categoryHex(row.category.color) }" aria-hidden="true" />
      <span class="min-w-0 truncate font-medium">{{ name }}</span>
      <UiBadge v-if="row.category.archived" class="shrink-0">archivada</UiBadge>
    </div>

    <div class="col-span-2 row-start-2 min-w-0 sm:col-span-1 sm:col-start-2 sm:row-start-1">
      <ProgressBar :ratio="barRatio(row)" :tone="stateTone(row.state)" :label="`Avance de ${name}`" />
    </div>

    <span class="num hidden text-right text-xs text-muted sm:col-start-3 sm:row-start-1 sm:block">{{ formatPercent(row.ratio) }}</span>

    <!-- Phone: status and spent share a line and wrap (never cut a figure) when both are long. Desktop: grid cells. -->
    <div class="col-span-2 row-start-3 flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 sm:contents">
      <p :class="['num text-xs sm:col-span-2 sm:col-start-2 sm:row-start-2', isOver(row) ? 'font-medium text-danger' : 'text-muted']">
        {{ statusText(row) }}
      </p>
      <RouterLink
        to="/movimientos"
        class="num ml-auto rounded text-xs hover:text-primary hover:underline sm:col-start-4 sm:row-span-2 sm:row-start-1 sm:ml-0 sm:justify-self-end sm:text-[14px]"
        :aria-label="`Gastado en ${name}: ${formatMoney(row.spent)}. Ver movimientos`"
      >
        <span class="text-muted sm:hidden">Gastado </span>{{ formatMoney(row.spent) }}
      </RouterLink>
    </div>

    <div class="col-start-2 row-start-1 flex justify-end sm:col-start-5 sm:row-span-2">
      <div v-if="editing" class="w-36 sm:w-full" @keydown="onKeydown" @focusout="emit('commit', typedText($event), 'blur')">
        <UiMoneyInput ref="input" v-model="draft" placeholder="Sin tope" :invalid="invalid" :aria-label="`Tope de ${name}`" />
      </div>
      <button
        v-else
        type="button"
        :data-budget-trigger="row.category.id"
        :class="[
          'num -mr-2 h-10 rounded-lg px-2 text-[14px] hover:bg-primary-soft sm:h-8',
          shownBudget == null ? 'font-medium text-primary' : 'font-semibold',
          saving && 'opacity-60',
        ]"
        :aria-label="shownBudget == null ? `Poner tope a ${name}` : `Cambiar el tope de ${name}: ${formatMoney(shownBudget)}`"
        @click="emit('start')"
      >
        {{ shownBudget == null ? 'Poner tope' : formatMoney(shownBudget) }}
      </button>
    </div>
  </li>
</template>

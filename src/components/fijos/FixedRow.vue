<script setup lang="ts">
/**
 * One line of the monthly checklist: check, name + detail, amount (editable
 * in place while unpaid), status badge and the actions menu.
 */
import { computed, nextTick, ref } from 'vue'
import { ArrowDown, ArrowUp, CalendarOff, CalendarX, Check, Eraser, Minus, Pencil, Trash2, Undo2 } from 'lucide-vue-next'
import { FIXED_STATUS_LABELS, type Category, type FixedMonthItem } from '@shared/contract'
import UiBadge from '@/components/ui/UiBadge.vue'
import UiMoneyInput from '@/components/ui/UiMoneyInput.vue'
import { formatMoney } from '@/lib/format'
import { categoryHex } from '@/lib/palette'
import RowMenu, { type MenuItem } from './RowMenu.vue'
import { amountEntry, dueText, partialText, resetOverrideLabel, rowAmountText, statusTone } from './fixed'

export type RowAction = 'edit' | 'unpay' | 'skip' | 'up' | 'down' | 'end' | 'remove'

const props = defineProps<{
  item: FixedMonthItem
  category: Category | undefined
  first: boolean
  last: boolean
}>()

const emit = defineEmits<{
  toggle: []
  amount: [value: number | null]
  action: [action: RowAction]
}>()

const paid = computed(() => props.item.status === 'paid')
const skipped = computed(() => props.item.status === 'skipped')
const due = computed(() => dueText(props.item))
const amountText = computed(() => rowAmountText(props.item))
const partial = computed(() => partialText(props.item))
const name = computed(() => props.item.fixed.name)

const checkLabel = computed(() => {
  if (skipped.value) return `${name.value} no aplica este mes`
  return paid.value ? `Desmarcar ${name.value} como pagado` : `Marcar ${name.value} como pagado`
})

const menuItems = computed<MenuItem[]>(() => [
  { key: 'edit', label: 'Editar', icon: Pencil },
  // The check of a partly paid row opens "Pagar": this is the way to undo its payments.
  ...(partial.value ? [{ key: 'unpay', label: 'Borrar abonos', icon: Eraser }] : []),
  // The server refuses to skip a month that has payments.
  { key: 'skip', label: skipped.value ? 'Sí aplica este mes' : 'No aplica este mes', icon: skipped.value ? Undo2 : CalendarOff, disabled: props.item.transactionIds.length > 0 },
  { key: 'up', label: 'Subir', icon: ArrowUp, disabled: props.first },
  { key: 'down', label: 'Bajar', icon: ArrowDown, disabled: props.last },
  { key: 'end', label: 'Terminar desde el mes siguiente', icon: CalendarX, disabled: props.item.fixed.endMonth === props.item.month },
  { key: 'remove', label: 'Eliminar', icon: Trash2, danger: true },
])

// ---- inline amount editing (changes ONLY this month) ----
const editing = ref(false)
const draft = ref<number | null>(null)
/** Raw text of the field: tells an empty field from one that is not a number. */
const draftText = ref('')
const draftError = ref('')
const moneyInput = ref<InstanceType<typeof UiMoneyInput>>()
/** The button that shows the amount (or "Poner monto"): where the focus goes back to. */
const amountButton = ref<HTMLButtonElement>()

/** The focused control is about to leave the page: without this the focus falls to <body> and Tab restarts from the top. */
async function focusAmountButton() {
  await nextTick()
  amountButton.value?.focus()
}

async function startEdit() {
  draft.value = props.item.expectedAmount > 0 ? props.item.expectedAmount : null
  draftText.value = draft.value == null ? '' : String(draft.value)
  draftError.value = ''
  editing.value = true
  await nextTick()
  moneyInput.value?.focus()
  moneyInput.value?.select()
}

/** Enter and blur both land here; the flag keeps the second one from saving twice. */
function commit(fromKeyboard: boolean) {
  if (!editing.value) return
  const entry = amountEntry(draftText.value)
  // Not a number: nothing is sent and the field stays open so it can be fixed (Esc leaves).
  if (entry === 'invalid') {
    draftError.value = 'Eso no es un monto'
    return
  }
  editing.value = false
  if (entry === 'empty') {
    // Emptying the field takes this month's own amount away, when it has one.
    if (props.item.hasOverride) emit('amount', null)
  } else if (draft.value != null && draft.value !== props.item.expectedAmount) emit('amount', draft.value)
  if (fromKeyboard) void focusAmountButton()
}

function onDraftInput(event: Event) {
  draftText.value = (event.target as HTMLInputElement).value
  draftError.value = ''
}

function cancel() {
  editing.value = false
  void focusAmountButton()
}

function resetOverride() {
  emit('amount', null)
  // This button goes away once the month has no amount of its own.
  void focusAmountButton()
}
</script>

<template>
  <li
    class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-2 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] [&+li]:shadow-[inset_0_1px_0_rgb(var(--fill))]"
  >
    <button
      type="button"
      :disabled="skipped"
      :aria-pressed="paid"
      :aria-label="checkLabel"
      :class="[
        'flex size-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors disabled:cursor-not-allowed',
        paid ? 'border-success bg-success text-surface' : 'border-line bg-surface text-transparent hover:border-success hover:text-success',
        skipped && 'opacity-50 hover:border-line',
      ]"
      @click="emit('toggle')"
    >
      <Minus v-if="skipped" class="size-5 text-muted" aria-hidden="true" />
      <Check v-else class="size-5" :stroke-width="3" aria-hidden="true" />
    </button>

    <div :class="['min-w-0', skipped && 'opacity-60']">
      <p :class="['truncate text-[15px] font-medium', paid && 'text-muted line-through decoration-muted/60']">{{ name }}</p>
      <p class="flex flex-wrap items-center gap-x-2 text-xs text-muted">
        <span class="inline-flex min-w-0 items-center gap-1.5">
          <span class="size-2 shrink-0 rounded-full" :style="{ backgroundColor: categoryHex(category?.color) }" aria-hidden="true" />
          <span class="truncate">{{ category?.name ?? 'Sin categoría' }}</span>
        </span>
        <span v-if="due.text" :class="due.danger && 'font-medium text-danger'">{{ due.text }}</span>
        <span v-if="partial" class="num">{{ partial }}</span>
        <span v-if="item.hasOverride && !paid && !skipped" class="inline-flex items-center gap-1.5">
          <span>Solo este mes</span>
          <button type="button" class="inline-flex min-h-10 items-center rounded px-1 font-medium text-primary hover:underline sm:min-h-0" @click="resetOverride">
            {{ resetOverrideLabel(item.fixed.amount) }}
          </button>
        </span>
      </p>
    </div>

    <div :class="['text-right', skipped && 'opacity-60']">
      <div v-if="editing" class="w-32 sm:w-40" @keydown.enter.prevent="commit(true)" @keydown.esc.stop="cancel" @focusout="commit(false)">
        <UiMoneyInput ref="moneyInput" v-model="draft" :invalid="!!draftError" :aria-label="`Monto de ${name} este mes`" @input="onDraftInput" />
        <p v-if="draftError" class="mt-1 text-xs text-danger" role="alert">{{ draftError }}</p>
      </div>
      <span v-else-if="paid || skipped" class="num text-[15px] font-semibold">{{ amountText }}</span>
      <button
        v-else-if="amountText === null"
        ref="amountButton"
        type="button"
        class="h-10 rounded-lg px-2 text-[14px] font-medium text-primary hover:bg-primary-soft sm:h-8"
        @click="startEdit"
      >
        Poner monto
      </button>
      <button
        v-else
        ref="amountButton"
        type="button"
        class="num -mr-2 h-10 rounded-lg px-2 text-[15px] font-semibold hover:bg-fill sm:h-8"
        :aria-label="partial ? `Falta ${amountText} de ${name}. Cambiar el monto de este mes, ahora ${formatMoney(item.expectedAmount)}` : `Cambiar el monto de ${name} este mes, ahora ${amountText}`"
        title="Cambiar el monto solo este mes"
        @click="startEdit"
      >
        {{ amountText }}
      </button>
    </div>

    <div class="col-span-2 col-start-2 flex items-center justify-between gap-2 sm:col-span-1 sm:col-start-4 sm:w-52">
      <UiBadge :tone="statusTone(item.status)">{{ FIXED_STATUS_LABELS[item.status] }}</UiBadge>
      <RowMenu :label="`Acciones de ${name}`" :items="menuItems" @select="emit('action', $event as RowAction)" />
    </div>
  </li>
</template>

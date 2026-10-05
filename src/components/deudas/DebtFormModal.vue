<script setup lang="ts">
/** Create or edit a debt. Editing sends only the fields that changed. */
import { computed, reactive, ref, watch } from 'vue'
import { DEBT_KIND_LABELS, DEBT_KINDS, debtInputSchema, debtPatchSchema, type Debt, type DebtKind, type FixedExpense } from '@shared/contract'
import UiButton from '@/components/ui/UiButton.vue'
import UiField from '@/components/ui/UiField.vue'
import UiModal from '@/components/ui/UiModal.vue'
import UiMoneyInput from '@/components/ui/UiMoneyInput.vue'
import { amountEntry, splitFieldErrors } from '@/components/fijos/fixed'
import { api } from '@/lib/api'
import { todayIso } from '@/lib/format'
import { errorFields, errorMessage, useApiMutation } from '@/lib/queries'
import { useToasts } from '@/lib/toasts'
import { debtBody, debtPatch, type DebtFormValues } from './debts'

const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{
  /** Null = create a new one. */
  editing: Debt | null
  /** Fixed expenses of the current month, to pick the one that pays this debt. */
  fixedExpenses: FixedExpense[]
  /** The list above could not be loaded: the select would offer "Ninguno" alone and look complete. */
  fixedError?: boolean
}>()
const emit = defineEmits<{ retryFixed: [] }>()

const toasts = useToasts()

const form = reactive({
  name: '',
  kind: 'tarjeta' as DebtKind,
  initialBalance: null as number | null,
  startDate: todayIso(),
  fixedExpenseId: null as number | null,
  note: '',
})
/** Raw text of the amount field: tells an empty field from one that is not a number. */
const amountText = ref('')
const errors = ref<Record<string, string>>({})
const formError = ref('')

/** A linked fixed expense that does not apply this month still has to show as the chosen one. */
const linkedButMissing = computed(() => {
  const id = props.editing?.fixedExpenseId
  return id != null && !props.fixedExpenses.some((f) => f.id === id) ? id : null
})

watch(open, (isOpen) => {
  if (!isOpen) return
  const source = props.editing
  form.name = source?.name ?? ''
  form.kind = source?.kind ?? 'tarjeta'
  form.initialBalance = source?.initialBalance ?? null
  amountText.value = form.initialBalance == null ? '' : String(form.initialBalance)
  form.startDate = source?.startDate ?? todayIso()
  form.fixedExpenseId = source?.fixedExpenseId ?? null
  form.note = source?.note ?? ''
  errors.value = {}
  formError.value = ''
})

const save = useApiMutation(
  (input: { editing: Debt | null; values: DebtFormValues }) =>
    input.editing ? api.debts.update(input.editing.id, debtPatch(input.editing, input.values)) : api.debts.create(debtBody(input.values)),
  { silentError: true },
)

function collectIssues(issues: Array<{ path: PropertyKey[]; message: string }>) {
  for (const issue of issues) {
    const field = String(issue.path[0] ?? '')
    errors.value[field] ??= FIELD_MESSAGES[field] ?? issue.message
  }
}

async function submit() {
  if (save.isPending.value) return
  errors.value = {}
  formError.value = ''
  // Text that is not an amount reaches here as null: saving it as 0 would wipe the balance it had.
  const entry = amountEntry(amountText.value)
  if (entry !== 'ok' || form.initialBalance == null) {
    errors.value.initialBalance = entry === 'empty' ? 'Escribe cuánto debías' : 'Eso no es un monto. Escribe solo el número, por ejemplo 2500000 o 2,5m'
    return
  }
  const values: DebtFormValues = {
    name: form.name,
    kind: form.kind,
    initialBalance: form.initialBalance,
    startDate: form.startDate,
    fixedExpenseId: form.fixedExpenseId,
    note: form.note,
  }
  const parsed = props.editing ? debtPatchSchema.safeParse(debtPatch(props.editing, values)) : debtInputSchema.safeParse(debtBody(values))
  if (!parsed.success) {
    collectIssues(parsed.error.issues)
    return
  }
  try {
    await save.mutateAsync({ editing: props.editing, values })
  } catch (error) {
    const split = splitFieldErrors(errorFields(error), VISIBLE_FIELDS)
    errors.value = split.fields
    if (split.rest) formError.value = split.rest
    else if (Object.keys(split.fields).length === 0) formError.value = errorMessage(error)
    return
  }
  toasts.success(props.editing ? 'Deuda actualizada' : 'Deuda agregada')
  open.value = false
}

const FIXED_LOAD_ERROR = 'No se pudieron cargar los gastos fijos: la lista está incompleta. Puedes guardar sin enlazar y enlazar después.'
const VISIBLE_FIELDS = ['name', 'kind', 'initialBalance', 'startDate', 'fixedExpenseId', 'note']
const FIELD_MESSAGES: Record<string, string> = {
  startDate: 'Elige la fecha desde la que cuentas la deuda',
  fixedExpenseId: 'Elige un gasto fijo de la lista',
}
</script>

<template>
  <UiModal v-model:open="open" :title="editing ? 'Editar deuda' : 'Agregar deuda'">
    <form id="debt-form" class="flex flex-col gap-3" @submit.prevent="submit">
      <UiField label="Nombre" :error="errors.name">
        <input v-model="form.name" type="text" class="control" maxlength="60" placeholder="BBVA 1, Rappi, Moto…" :aria-invalid="!!errors.name || undefined" />
      </UiField>

      <div>
        <span class="label" id="debt-kind-label">Tipo</span>
        <div class="grid grid-cols-2 gap-1 rounded-lg bg-fill p-1" role="radiogroup" aria-labelledby="debt-kind-label">
          <button
            v-for="kind in DEBT_KINDS"
            :key="kind"
            type="button"
            role="radio"
            :aria-checked="form.kind === kind"
            :class="[
              'h-8 rounded-md px-2 text-[14px] font-medium transition-colors sm:h-6',
              form.kind === kind ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink',
            ]"
            @click="form.kind = kind"
          >
            {{ DEBT_KIND_LABELS[kind] }}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <UiField label="¿Cuánto debías?" :error="errors.initialBalance" hint="Puedes escribir 2,5m o 800k">
          <UiMoneyInput v-model="form.initialBalance" :invalid="!!errors.initialBalance" @input="amountText = ($event.target as HTMLInputElement).value" />
        </UiField>

        <UiField label="¿Desde cuándo?" :error="errors.startDate" hint="Los pagos anteriores a esta fecha ya están dentro del saldo inicial">
          <input v-model="form.startDate" type="date" class="control" :aria-invalid="!!errors.startDate || undefined" />
        </UiField>
      </div>

      <div>
        <UiField label="Gasto fijo que la paga" :error="errors.fixedExpenseId" hint="Cada pago de ese gasto fijo baja esta deuda por sí solo">
          <select v-model="form.fixedExpenseId" class="control" :aria-invalid="!!errors.fixedExpenseId || undefined">
            <option :value="null">Ninguno</option>
            <option v-if="linkedButMissing != null" :value="linkedButMissing">Gasto fijo enlazado (no aplica este mes)</option>
            <option v-for="fixed in fixedExpenses" :key="fixed.id" :value="fixed.id">{{ fixed.name }}</option>
          </select>
        </UiField>
        <p v-if="fixedError" class="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-danger" role="alert">
          <span>{{ FIXED_LOAD_ERROR }}</span>
          <button type="button" class="font-semibold underline" @click="emit('retryFixed')">Reintentar</button>
        </p>
      </div>

      <UiField label="Nota" :error="errors.note">
        <input v-model="form.note" type="text" class="control" maxlength="500" placeholder="Opcional" />
      </UiField>

      <p v-if="formError" class="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger" role="alert">{{ formError }}</p>
    </form>

    <template #footer>
      <UiButton variant="ghost" @click="open = false">Cancelar</UiButton>
      <UiButton variant="primary" type="submit" form="debt-form" :loading="save.isPending.value">Guardar</UiButton>
    </template>
  </UiModal>
</template>

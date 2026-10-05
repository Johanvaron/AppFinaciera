<script setup lang="ts">
/** Create or edit a fixed expense (the definition that repeats every month). */
import { computed, reactive, ref, watch } from 'vue'
import { CATEGORY_GROUP_LABELS, CATEGORY_GROUPS, fixedExpenseInputSchema, type FixedExpense, type FixedExpenseInput, type Month } from '@shared/contract'
import UiButton from '@/components/ui/UiButton.vue'
import UiField from '@/components/ui/UiField.vue'
import UiModal from '@/components/ui/UiModal.vue'
import UiMoneyInput from '@/components/ui/UiMoneyInput.vue'
import { api } from '@/lib/api'
import { useToasts } from '@/lib/toasts'
import { errorFields, errorMessage, useAccounts, useApiMutation, useCategories } from '@/lib/queries'
import { amountEntry, splitFieldErrors } from './fixed'

const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{
  /** Null = create a new one. */
  editing: FixedExpense | null
  /** Month on screen: default "Desde" of a new fixed expense. */
  month: Month
}>()

const toasts = useToasts()
const { data: accounts } = useAccounts()
const { data: categories } = useCategories()

const form = reactive({
  name: '',
  amount: null as number | null,
  variableAmount: false,
  dueDay: '' as number | '',
  categoryId: null as number | null,
  accountId: null as number | null,
  startMonth: props.month,
  endMonth: '',
  note: '',
})
/** Raw text of the amount field: tells an empty field from one that is not a number. */
const amountText = ref('')
const errors = ref<Record<string, string>>({})
const formError = ref('')

const expenseCategories = computed(() => (categories.value ?? []).filter((c) => c.kind === 'expense' && (!c.archived || c.id === form.categoryId)))
const categoryGroups = computed(() =>
  CATEGORY_GROUPS.map((group) => ({
    label: CATEGORY_GROUP_LABELS[group],
    items: expenseCategories.value.filter((c) => c.group === group),
  })).filter((g) => g.items.length > 0),
)
const usableAccounts = computed(() => (accounts.value ?? []).filter((a) => !a.archived || a.id === form.accountId))

function defaultCategory(): number | null {
  const usable = expenseCategories.value.filter((c) => !c.archived)
  return (usable.find((c) => c.group === 'fijos') ?? usable[0])?.id ?? null
}

watch(open, (isOpen) => {
  if (!isOpen) return
  const source = props.editing
  form.name = source?.name ?? ''
  form.amount = source && source.amount > 0 ? source.amount : null
  amountText.value = form.amount == null ? '' : String(form.amount)
  form.variableAmount = source?.variableAmount ?? false
  form.dueDay = source?.dueDay ?? ''
  form.categoryId = source?.categoryId ?? null
  form.accountId = source?.accountId ?? null
  form.startMonth = source?.startMonth ?? props.month
  form.endMonth = source?.endMonth ?? ''
  form.note = source?.note ?? ''
  if (!source) form.categoryId = defaultCategory()
  errors.value = {}
  formError.value = ''
})
// Categories may arrive after the dialog opens.
watch(expenseCategories, () => {
  if (open.value && !props.editing && form.categoryId == null) form.categoryId = defaultCategory()
})

const save = useApiMutation(
  (input: FixedExpenseInput) => (props.editing ? api.fixed.update(props.editing.id, input) : api.fixed.create(input)),
  { silentError: true },
)
async function submit() {
  if (save.isPending.value) return
  errors.value = {}
  formError.value = ''
  // Text that is not an amount reaches here as null: saving it as 0 would wipe the amount it had.
  if (amountEntry(amountText.value) === 'invalid') {
    errors.value.amount = 'Eso no es un monto. Escribe solo el número, por ejemplo 400000 o 400k'
    return
  }
  const parsed = fixedExpenseInputSchema.safeParse({
    name: form.name,
    amount: form.amount ?? 0,
    variableAmount: form.variableAmount,
    dueDay: form.dueDay === '' ? null : form.dueDay,
    categoryId: form.categoryId ?? 0,
    accountId: form.accountId,
    startMonth: form.startMonth,
    endMonth: form.endMonth === '' ? null : form.endMonth,
    note: form.note,
  })
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? '')
      errors.value[field] ??= FIELD_MESSAGES[field] ?? issue.message
    }
    return
  }
  if (!parsed.data.variableAmount && parsed.data.amount === 0) {
    errors.value.amount = 'Pon el monto mensual, o marca que cambia cada mes'
    return
  }
  if (parsed.data.endMonth != null && parsed.data.endMonth < parsed.data.startMonth) {
    errors.value.endMonth = 'No puede terminar antes de empezar'
    return
  }
  try {
    await save.mutateAsync(parsed.data)
  } catch (error) {
    const split = splitFieldErrors(errorFields(error), VISIBLE_FIELDS)
    errors.value = split.fields
    if (split.rest) formError.value = split.rest
    else if (Object.keys(split.fields).length === 0) formError.value = errorMessage(error)
    return
  }
  toasts.success(props.editing ? 'Gasto fijo actualizado' : 'Gasto fijo agregado')
  open.value = false
}

/** Fields with a control that can show its own error. */
const VISIBLE_FIELDS = ['name', 'amount', 'dueDay', 'categoryId', 'accountId', 'startMonth', 'endMonth', 'note']

const FIELD_MESSAGES: Record<string, string> = {
  categoryId: 'Elige una categoría',
  dueDay: 'Escribe un día entre 1 y 31',
  startMonth: 'Elige el mes desde el que aplica',
  endMonth: 'Mes inválido',
}
</script>

<template>
  <UiModal v-model:open="open" :title="editing ? 'Editar gasto fijo' : 'Agregar gasto fijo'">
    <form id="fixed-expense-form" class="flex flex-col gap-3" @submit.prevent="submit">
      <UiField label="Nombre" :error="errors.name">
        <input v-model="form.name" type="text" class="control" maxlength="60" placeholder="Arriendo, internet, tarjeta…" :aria-invalid="!!errors.name || undefined" />
      </UiField>

      <label class="flex min-h-10 items-center gap-2 text-[14px] sm:min-h-8">
        <input v-model="form.variableAmount" type="checkbox" class="size-4 accent-primary" />
        <span>El monto cambia cada mes</span>
      </label>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <UiField
          :label="form.variableAmount ? 'Monto aproximado (opcional)' : 'Monto mensual'"
          :error="errors.amount"
          :hint="form.variableAmount ? 'Cada mes pones el monto real' : 'Puedes escribir 200k o 1,5m'"
        >
          <UiMoneyInput v-model="form.amount" :invalid="!!errors.amount" @input="amountText = ($event.target as HTMLInputElement).value" />
        </UiField>

        <UiField label="Día de pago (opcional)" :error="errors.dueDay" hint="Del 1 al 31">
          <input v-model.number="form.dueDay" type="number" inputmode="numeric" min="1" max="31" step="1" class="control num" :aria-invalid="!!errors.dueDay || undefined" />
        </UiField>

        <UiField label="Categoría" :error="errors.categoryId">
          <select v-model="form.categoryId" class="control" :aria-invalid="!!errors.categoryId || undefined">
            <option :value="null" disabled>Elige una categoría</option>
            <optgroup v-for="group in categoryGroups" :key="group.label" :label="group.label">
              <option v-for="category in group.items" :key="category.id" :value="category.id">{{ category.name }}</option>
            </optgroup>
          </select>
        </UiField>

        <UiField label="Cuenta con la que suele pagarse (opcional)" :error="errors.accountId">
          <select v-model="form.accountId" class="control">
            <option :value="null">Sin cuenta fija</option>
            <option v-for="account in usableAccounts" :key="account.id" :value="account.id">{{ account.name }}</option>
          </select>
        </UiField>

        <UiField label="Desde" :error="errors.startMonth" hint="Primer mes en el que aparece">
          <input v-model="form.startMonth" type="month" class="control" placeholder="AAAA-MM" :aria-invalid="!!errors.startMonth || undefined" />
        </UiField>

        <UiField v-if="editing" label="Hasta (opcional)" :error="errors.endMonth" hint="Último mes en el que aparece. Vacío = sigue activo">
          <input v-model="form.endMonth" type="month" class="control" placeholder="AAAA-MM" :aria-invalid="!!errors.endMonth || undefined" />
        </UiField>
      </div>

      <UiField label="Nota" :error="errors.note">
        <input v-model="form.note" type="text" class="control" maxlength="500" placeholder="Opcional" />
      </UiField>

      <p v-if="formError" class="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger" role="alert">{{ formError }}</p>
    </form>

    <template #footer>
      <UiButton variant="ghost" @click="open = false">Cancelar</UiButton>
      <UiButton variant="primary" type="submit" form="fixed-expense-form" :loading="save.isPending.value">Guardar</UiButton>
    </template>
  </UiModal>
</template>

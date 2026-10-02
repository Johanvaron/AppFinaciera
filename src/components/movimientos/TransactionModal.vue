<script setup lang="ts">
/**
 * Create or edit a movement. Opened from anywhere through useQuickAdd()
 * (global "Nuevo movimiento" button, the N key, or a row's edit action).
 * Amount first, Enter saves, "Guardar y agregar otro" keeps the modal open.
 */
import { computed, reactive, ref, watch } from 'vue'
import { CATEGORY_GROUP_LABELS, CATEGORY_GROUPS, transactionInputSchema, type TransactionType } from '@shared/contract'
import UiButton from '@/components/ui/UiButton.vue'
import UiField from '@/components/ui/UiField.vue'
import UiModal from '@/components/ui/UiModal.vue'
import UiMoneyInput from '@/components/ui/UiMoneyInput.vue'
import { api } from '@/lib/api'
import { todayIso } from '@/lib/format'
import { errorFields, errorMessage, useAccounts, useApiMutation, useCategories } from '@/lib/queries'
import { useQuickAdd } from '@/stores/quickAdd'
import { useToasts } from '@/lib/toasts'

const LAST_ACCOUNT_KEY = 'finanzas-last-account'
const TYPES: { value: TransactionType; label: string }[] = [
  { value: 'expense', label: 'Gasto' },
  { value: 'income', label: 'Ingreso' },
  { value: 'transfer', label: 'Transferencia' },
]

const quickAdd = useQuickAdd()
const toasts = useToasts()
const { data: accounts } = useAccounts()
const { data: categories } = useCategories()

const form = reactive({
  type: 'expense' as TransactionType,
  amount: null as number | null,
  categoryId: null as number | null,
  accountId: null as number | null,
  toAccountId: null as number | null,
  date: todayIso(),
  description: '',
  note: '',
})
const errors = ref<Record<string, string>>({})
const formError = ref('')
const amountInput = ref<InstanceType<typeof UiMoneyInput>>()

const editing = computed(() => quickAdd.editing)
/** The payment of a fixed expense: the server keeps the link and rejects any type other than expense. */
const isFixedPayment = computed(() => editing.value?.fixedExpenseId != null)
const activeAccounts = computed(() => (accounts.value ?? []).filter((a) => !a.archived || a.id === form.accountId || a.id === form.toAccountId))

/** Categories of the chosen type, grouped for the <optgroup>s. */
const categoryGroups = computed(() => {
  const kind = form.type === 'income' ? 'income' : 'expense'
  const usable = (categories.value ?? []).filter((c) => c.kind === kind && (!c.archived || c.id === form.categoryId))
  return CATEGORY_GROUPS.map((group) => ({
    label: CATEGORY_GROUP_LABELS[group],
    items: usable.filter((c) => c.group === group),
  })).filter((g) => g.items.length > 0)
})

function readLastAccount(): number | null {
  try {
    const stored = Number(localStorage.getItem(LAST_ACCOUNT_KEY))
    return activeAccounts.value.some((a) => a.id === stored) ? stored : null
  } catch {
    return null
  }
}

function reset() {
  const source = quickAdd.editing
  const defaults = quickAdd.defaults
  form.type = source?.type ?? defaults.type ?? 'expense'
  form.amount = source?.amount ?? null
  form.categoryId = source?.categoryId ?? defaults.categoryId ?? null
  form.accountId = source?.accountId ?? defaults.accountId ?? readLastAccount() ?? activeAccounts.value[0]?.id ?? null
  form.toAccountId = source?.toAccountId ?? null
  form.date = source?.date ?? defaults.date ?? todayIso()
  form.description = source?.description ?? ''
  form.note = source?.note ?? ''
  errors.value = {}
  formError.value = ''
}

watch(() => quickAdd.open, (isOpen) => isOpen && reset())
// Accounts may load after the modal opens the first time.
watch(activeAccounts, (list) => {
  if (quickAdd.open && form.accountId == null) form.accountId = readLastAccount() ?? list[0]?.id ?? null
})

function setType(type: TransactionType) {
  // Clicking the active type must not wipe the chosen category.
  if (type === form.type) return
  form.type = type
  form.categoryId = null
  form.toAccountId = null
}

const save = useApiMutation(
  (input: Parameters<typeof api.transactions.create>[0]) =>
    editing.value ? api.transactions.update(editing.value.id, input) : api.transactions.create(input),
  { silentError: true },
)

/**
 * Paints each rejection next to its input. One on anything without an input on
 * screen right now (the type, an unknown key) goes to the general line, never to nowhere.
 */
function showErrors(fields: Record<string, string>, fallback: string) {
  const shown = ['amount', 'accountId', 'date', 'description', 'note', form.type === 'transfer' ? 'toAccountId' : 'categoryId']
  const orphans = Object.entries(fields).filter(([field]) => !shown.includes(field))
  errors.value = fields
  if (orphans.length > 0) formError.value = orphans.map(([, message]) => message).join(' ')
  else if (Object.keys(fields).length === 0) formError.value = fallback
}

async function submit(keepOpen: boolean) {
  if (save.isPending.value) return
  errors.value = {}
  formError.value = ''
  const parsed = transactionInputSchema.safeParse({
    date: form.date,
    amount: form.amount ?? 0,
    type: form.type,
    accountId: form.accountId ?? 0,
    toAccountId: form.type === 'transfer' ? form.toAccountId : null,
    categoryId: form.type === 'transfer' ? null : form.categoryId,
    description: form.description,
    note: form.note,
  })
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? '')
      fields[field] ??= field === 'accountId' ? 'Elige una cuenta' : issue.message
    }
    showErrors(fields, '')
    return
  }
  try {
    await save.mutateAsync(parsed.data)
  } catch (error) {
    showErrors(errorFields(error), errorMessage(error))
    return
  }
  try {
    localStorage.setItem(LAST_ACCOUNT_KEY, String(parsed.data.accountId))
  } catch {
    // Not being able to remember the account is harmless.
  }
  toasts.success(editing.value ? 'Movimiento actualizado' : 'Movimiento guardado')
  if (keepOpen && !editing.value) {
    form.amount = null
    form.description = ''
    form.note = ''
    amountInput.value?.focus()
  } else {
    quickAdd.close()
  }
}
</script>

<template>
  <UiModal v-model:open="quickAdd.open" :title="editing ? 'Editar movimiento' : 'Nuevo movimiento'">
    <form id="transaction-form" class="flex flex-col gap-3" @submit.prevent="submit(false)">
      <div class="flex rounded-lg bg-fill p-1" role="radiogroup" aria-label="Tipo de movimiento">
        <button
          v-for="option in TYPES"
          :key="option.value"
          type="button"
          role="radio"
          :aria-checked="form.type === option.value"
          :disabled="isFixedPayment && option.value !== 'expense'"
          :class="[
            'h-10 flex-1 rounded-md text-[14px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:h-8',
            form.type === option.value ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink',
          ]"
          @click="setType(option.value)"
        >
          {{ option.label }}
        </button>
      </div>

      <p v-if="isFixedPayment" class="text-xs text-muted">Este movimiento es el pago de un gasto fijo, así que sigue siendo un gasto.</p>

      <UiField label="Monto" :error="errors.amount" hint="Puedes escribir 200k o 1,5m">
        <UiMoneyInput ref="amountInput" v-model="form.amount" data-autofocus :invalid="!!errors.amount" />
      </UiField>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <UiField v-if="form.type !== 'transfer'" label="Categoría" :error="errors.categoryId">
          <select v-model="form.categoryId" class="control" :aria-invalid="!!errors.categoryId || undefined">
            <option :value="null" disabled>Elige una categoría</option>
            <optgroup v-for="group in categoryGroups" :key="group.label" :label="group.label">
              <option v-for="category in group.items" :key="category.id" :value="category.id">{{ category.name }}</option>
            </optgroup>
          </select>
        </UiField>

        <UiField :label="form.type === 'transfer' ? 'Sale de' : 'Cuenta'" :error="errors.accountId">
          <select v-model="form.accountId" class="control" :aria-invalid="!!errors.accountId || undefined">
            <option :value="null" disabled>Elige una cuenta</option>
            <option v-for="account in activeAccounts" :key="account.id" :value="account.id">{{ account.name }}</option>
          </select>
        </UiField>

        <UiField v-if="form.type === 'transfer'" label="Entra a" :error="errors.toAccountId">
          <select v-model="form.toAccountId" class="control" :aria-invalid="!!errors.toAccountId || undefined">
            <option :value="null" disabled>Elige la cuenta destino</option>
            <option v-for="account in activeAccounts" :key="account.id" :value="account.id" :disabled="account.id === form.accountId">{{ account.name }}</option>
          </select>
        </UiField>

        <UiField label="Fecha" :error="errors.date">
          <input v-model="form.date" type="date" class="control" />
        </UiField>

        <UiField label="Descripción" :error="errors.description">
          <input v-model="form.description" type="text" class="control" maxlength="120" placeholder="Opcional" />
        </UiField>
      </div>

      <UiField label="Nota" :error="errors.note">
        <input v-model="form.note" type="text" class="control" maxlength="500" placeholder="Opcional" />
      </UiField>

      <p v-if="formError" class="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger" role="alert">{{ formError }}</p>
    </form>

    <template #footer>
      <UiButton variant="ghost" @click="quickAdd.close()">Cancelar</UiButton>
      <UiButton v-if="!editing" :loading="save.isPending.value" @click="submit(true)">Guardar y agregar otro</UiButton>
      <UiButton variant="primary" type="submit" form="transaction-form" :loading="save.isPending.value">Guardar</UiButton>
    </template>
  </UiModal>
</template>

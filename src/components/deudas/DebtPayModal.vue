<script setup lang="ts">
/**
 * "Abonar": money that leaves one of the accounts and lowers the debt in the
 * same move. It becomes a normal expense movement linked to the debt.
 */
import { computed, reactive, ref, watch } from 'vue'
import { debtPaySchema, type Debt, type DebtPayInput } from '@shared/contract'
import UiButton from '@/components/ui/UiButton.vue'
import UiField from '@/components/ui/UiField.vue'
import UiModal from '@/components/ui/UiModal.vue'
import UiMoneyInput from '@/components/ui/UiMoneyInput.vue'
import { amountEntry, splitFieldErrors } from '@/components/fijos/fixed'
import { api } from '@/lib/api'
import { formatMoney, todayIso } from '@/lib/format'
import { errorFields, errorMessage, useAccounts, useApiMutation } from '@/lib/queries'
import { useToasts } from '@/lib/toasts'

const LAST_ACCOUNT_KEY = 'finanzas-last-account'
const VISIBLE_FIELDS = ['date', 'amount', 'accountId', 'description']

const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ debt: Debt | null }>()

const toasts = useToasts()
const { data: accounts } = useAccounts()
const activeAccounts = computed(() => (accounts.value ?? []).filter((a) => !a.archived))

const form = reactive({ date: todayIso(), amount: null as number | null, accountId: null as number | null, description: '' })
const amountText = ref('')
const errors = ref<Record<string, string>>({})
const formError = ref('')

function readLastAccount(): number | null {
  try {
    const stored = Number(localStorage.getItem(LAST_ACCOUNT_KEY))
    return activeAccounts.value.some((a) => a.id === stored) ? stored : null
  } catch {
    return null
  }
}

watch(open, (isOpen) => {
  if (!isOpen) return
  form.date = todayIso()
  form.amount = null
  amountText.value = ''
  form.accountId = readLastAccount() ?? activeAccounts.value[0]?.id ?? null
  form.description = ''
  errors.value = {}
  formError.value = ''
})
watch(activeAccounts, (list) => {
  if (open.value && form.accountId == null) form.accountId = readLastAccount() ?? list[0]?.id ?? null
})

const save = useApiMutation((input: { id: number; body: DebtPayInput }) => api.debts.pay(input.id, input.body), { silentError: true })

async function submit() {
  if (save.isPending.value || !props.debt) return
  errors.value = {}
  formError.value = ''
  const entry = amountEntry(amountText.value)
  if (entry !== 'ok' || form.amount == null) {
    errors.value.amount = entry === 'empty' ? 'Escribe cuánto abonas' : 'Eso no es un monto. Escribe solo el número, por ejemplo 200000 o 200k'
    return
  }
  const parsed = debtPaySchema.safeParse({ date: form.date, amount: form.amount, accountId: form.accountId ?? 0, description: form.description })
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? '')
      errors.value[field] ??= field === 'date' ? 'Elige una fecha' : field === 'accountId' ? 'Elige la cuenta de donde sale la plata' : issue.message
    }
    return
  }
  try {
    await save.mutateAsync({ id: props.debt.id, body: parsed.data })
  } catch (error) {
    const split = splitFieldErrors(errorFields(error), VISIBLE_FIELDS)
    errors.value = split.fields
    if (split.rest) formError.value = split.rest
    else if (Object.keys(split.fields).length === 0) formError.value = errorMessage(error)
    return
  }
  try {
    localStorage.setItem(LAST_ACCOUNT_KEY, String(parsed.data.accountId))
  } catch {
    // Not remembering the account is harmless.
  }
  toasts.success(`Abono de ${formatMoney(parsed.data.amount)} a ${props.debt.name}`)
  open.value = false
}
</script>

<template>
  <UiModal v-model:open="open" :title="`Abonar a ${debt?.name ?? ''}`" size="sm">
    <form id="debt-pay-form" class="flex flex-col gap-3" @submit.prevent="submit">
      <p class="text-xs text-muted">Sale de tu cuenta y baja la deuda. Queda también en Movimientos como un gasto.</p>

      <UiField label="Monto" :error="errors.amount" hint="Puedes escribir 200k o 1,2m">
        <UiMoneyInput v-model="form.amount" data-autofocus :invalid="!!errors.amount" @input="amountText = ($event.target as HTMLInputElement).value" />
      </UiField>

      <UiField label="Sale de" :error="errors.accountId">
        <select v-model="form.accountId" class="control" :aria-invalid="!!errors.accountId || undefined">
          <option :value="null" disabled>Elige una cuenta</option>
          <option v-for="account in activeAccounts" :key="account.id" :value="account.id">{{ account.name }} · {{ formatMoney(account.balance) }}</option>
        </select>
      </UiField>

      <UiField label="Fecha" :error="errors.date">
        <input v-model="form.date" type="date" class="control" :aria-invalid="!!errors.date || undefined" />
      </UiField>

      <UiField label="Descripción" :error="errors.description">
        <input v-model="form.description" type="text" class="control" maxlength="120" :placeholder="`Abono a ${debt?.name ?? 'la deuda'}`" />
      </UiField>

      <p v-if="formError" class="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger" role="alert">{{ formError }}</p>
    </form>

    <template #footer>
      <UiButton variant="ghost" @click="open = false">Cancelar</UiButton>
      <UiButton variant="primary" type="submit" form="debt-pay-form" :loading="save.isPending.value">Abonar</UiButton>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
/** Create or edit an account. */
import { computed, reactive, ref, watch } from 'vue'
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPES, accountInputSchema, type Account, type AccountType } from '@shared/contract'
import UiButton from '@/components/ui/UiButton.vue'
import UiField from '@/components/ui/UiField.vue'
import UiModal from '@/components/ui/UiModal.vue'
import UiMoneyInput from '@/components/ui/UiMoneyInput.vue'
import { api } from '@/lib/api'
import { errorFields, errorMessage, useApiMutation } from '@/lib/queries'
import { useToasts } from '@/lib/toasts'
import { fromSignedBalance, toSignedBalance } from './settings'

const open = defineModel<boolean>('open', { required: true })
/** Null = new account. */
const props = defineProps<{ account: Account | null }>()

const toasts = useToasts()
const form = reactive({
  name: '',
  type: 'ahorros' as AccountType,
  amount: null as number | null,
  isDebt: false,
})
const errors = ref<Record<string, string>>({})
const formError = ref('')

watch(
  open,
  (isOpen) => {
    if (!isOpen) return
    const source = props.account
    const balance = fromSignedBalance(source?.initialBalance ?? 0)
    form.name = source?.name ?? ''
    form.type = source?.type ?? 'ahorros'
    form.amount = source ? balance.amount : null
    form.isDebt = balance.isDebt
    errors.value = {}
    formError.value = ''
  },
  { immediate: true },
)

// The checkbox stays visible for any account that already carries a negative start.
const showDebt = computed(() => form.type === 'tarjeta' || form.isDebt)
const balanceHint = computed(() =>
  form.type === 'tarjeta'
    ? 'Si ya debes plata en la tarjeta, marca "es deuda". El saldo actual = saldo inicial + movimientos.'
    : 'El saldo actual = saldo inicial + movimientos.',
)

const save = useApiMutation(
  (input: Parameters<typeof api.accounts.create>[0]) => (props.account ? api.accounts.update(props.account.id, input) : api.accounts.create(input)),
  { silentError: true },
)

async function submit() {
  errors.value = {}
  formError.value = ''
  const parsed = accountInputSchema.safeParse({
    name: form.name,
    type: form.type,
    initialBalance: toSignedBalance(form.amount, form.isDebt),
    archived: props.account?.archived ?? false,
  })
  if (!parsed.success) {
    for (const issue of parsed.error.issues) errors.value[String(issue.path[0] ?? '')] ??= issue.message
    return
  }
  try {
    await save.mutateAsync(parsed.data)
  } catch (error) {
    errors.value = errorFields(error)
    if (Object.keys(errors.value).length === 0) formError.value = errorMessage(error)
    return
  }
  toasts.success(props.account ? 'Cuenta actualizada' : 'Cuenta creada')
  open.value = false
}
</script>

<template>
  <UiModal v-model:open="open" :title="account ? 'Editar cuenta' : 'Agregar cuenta'">
    <form id="account-form" class="flex flex-col gap-3" @submit.prevent="submit">
      <UiField label="Nombre" :error="errors.name">
        <input
          v-model="form.name"
          type="text"
          class="control"
          maxlength="60"
          placeholder="Ej. Nequi, Bancolombia ahorros"
          :aria-invalid="!!errors.name || undefined"
        />
      </UiField>

      <UiField label="Tipo" :error="errors.type">
        <select v-model="form.type" class="control">
          <option v-for="type in ACCOUNT_TYPES" :key="type" :value="type">{{ ACCOUNT_TYPE_LABELS[type] }}</option>
        </select>
      </UiField>

      <UiField label="Saldo inicial" :error="errors.initialBalance" :hint="balanceHint">
        <UiMoneyInput v-model="form.amount" :invalid="!!errors.initialBalance" />
      </UiField>

      <label v-if="showDebt" class="flex min-h-10 items-center gap-2 sm:min-h-8">
        <input v-model="form.isDebt" type="checkbox" class="size-4 shrink-0 accent-primary" />
        <span>Es deuda (el saldo inicial se guarda en negativo)</span>
      </label>

      <p v-if="formError" class="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger" role="alert">{{ formError }}</p>
    </form>

    <template #footer>
      <UiButton variant="ghost" @click="open = false">Cancelar</UiButton>
      <UiButton variant="primary" type="submit" form="account-form" :loading="save.isPending.value">Guardar</UiButton>
    </template>
  </UiModal>
</template>

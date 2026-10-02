<script setup lang="ts">
/** Compact "mark as paid" dialog: amount, date, account. Enter confirms. */
import { computed, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { fixedPaySchema, type FixedMonthItem } from '@shared/contract'
import UiButton from '@/components/ui/UiButton.vue'
import UiField from '@/components/ui/UiField.vue'
import UiModal from '@/components/ui/UiModal.vue'
import UiMoneyInput from '@/components/ui/UiMoneyInput.vue'
import { api } from '@/lib/api'
import { todayIso } from '@/lib/format'
import { errorFields, errorMessage, useAccounts, useApiMutation } from '@/lib/queries'
import { remainingAmount, splitFieldErrors } from './fixed'

const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ item: FixedMonthItem | null }>()

const { data: accounts, isPending: accountsLoading } = useAccounts()

const form = reactive({ amount: null as number | null, date: todayIso(), accountId: null as number | null })
const errors = ref<Record<string, string>>({})
const formError = ref('')

const usableAccounts = computed(() => (accounts.value ?? []).filter((a) => !a.archived || a.id === props.item?.fixed.accountId))

function defaultAccount(): number | null {
  const preferred = props.item?.fixed.accountId
  if (preferred != null && usableAccounts.value.some((a) => a.id === preferred)) return preferred
  return usableAccounts.value.find((a) => !a.archived)?.id ?? null
}

/** What the dialog offers to pay: what is still owed, so a second payment never goes over. */
function defaultAmount(item: FixedMonthItem): number | null {
  const remaining = remainingAmount(item)
  return remaining > 0 ? remaining : null
}

watch(open, (isOpen) => {
  if (!isOpen || !props.item) return
  form.amount = defaultAmount(props.item)
  form.date = todayIso()
  form.accountId = defaultAccount()
  errors.value = {}
  formError.value = ''
})
// Accounts may arrive after the dialog opens.
watch(usableAccounts, () => {
  if (open.value && form.accountId == null) form.accountId = defaultAccount()
})

const pay = useApiMutation((input: { id: number; body: Parameters<typeof api.fixed.pay>[1] }) => api.fixed.pay(input.id, input.body), {
  success: 'Pagado',
  silentError: true,
})

async function submit() {
  if (!props.item || pay.isPending.value) return
  errors.value = {}
  formError.value = ''
  const parsed = fixedPaySchema.safeParse({
    month: props.item.month,
    amount: form.amount ?? 0,
    date: form.date,
    accountId: form.accountId ?? 0,
  })
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? '')
      errors.value[field] ??= field === 'accountId' ? 'Elige una cuenta' : issue.message
    }
    return
  }
  try {
    await pay.mutateAsync({ id: props.item.fixed.id, body: parsed.data })
    open.value = false
  } catch (error) {
    const split = splitFieldErrors(errorFields(error), ['amount', 'date', 'accountId'])
    errors.value = split.fields
    if (split.rest) formError.value = split.rest
    else if (Object.keys(split.fields).length === 0) formError.value = errorMessage(error)
  }
}
</script>

<template>
  <UiModal v-model:open="open" :title="`Pagar ${item?.fixed.name ?? ''}`" size="sm">
    <p v-if="accountsLoading" class="text-xs text-muted">Cargando cuentas…</p>
    <div v-else-if="usableAccounts.length === 0" class="flex flex-col gap-2 text-[14px]">
      <p>Para registrar un pago necesitas una cuenta de donde sale la plata.</p>
      <RouterLink to="/ajustes" class="font-medium text-primary hover:underline" @click="open = false">Crear una cuenta en Ajustes</RouterLink>
    </div>
    <form v-else id="fixed-pay-form" class="flex flex-col gap-3" @submit.prevent="submit">
      <UiField label="Monto" :error="errors.amount" hint="Puedes escribir 200k o 1,5m">
        <UiMoneyInput v-model="form.amount" data-autofocus :invalid="!!errors.amount" />
      </UiField>
      <div class="grid grid-cols-2 gap-3">
        <UiField label="Fecha" :error="errors.date">
          <input v-model="form.date" type="date" class="control" />
        </UiField>
        <UiField label="Cuenta" :error="errors.accountId">
          <select v-model="form.accountId" class="control" :aria-invalid="!!errors.accountId || undefined">
            <option :value="null" disabled>Elige una cuenta</option>
            <option v-for="account in usableAccounts" :key="account.id" :value="account.id">{{ account.name }}</option>
          </select>
        </UiField>
      </div>
      <p v-if="formError" class="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger" role="alert">{{ formError }}</p>
    </form>

    <template #footer>
      <UiButton variant="ghost" @click="open = false">Cancelar</UiButton>
      <UiButton v-if="usableAccounts.length > 0" variant="primary" type="submit" form="fixed-pay-form" :loading="pay.isPending.value">Marcar como pagado</UiButton>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
/** Write a charge (raises the debt) or a hand-made payment (lowers it) on a debt. */
import { computed, reactive, ref, watch } from 'vue'
import { debtEntryInputSchema, type Debt, type DebtEntryInput, type DebtEntryType } from '@shared/contract'
import UiButton from '@/components/ui/UiButton.vue'
import UiField from '@/components/ui/UiField.vue'
import UiModal from '@/components/ui/UiModal.vue'
import UiMoneyInput from '@/components/ui/UiMoneyInput.vue'
import { amountEntry, splitFieldErrors } from '@/components/fijos/fixed'
import { api } from '@/lib/api'
import { todayIso } from '@/lib/format'
import { errorFields, errorMessage, useApiMutation } from '@/lib/queries'
import { useToasts } from '@/lib/toasts'

const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ debt: Debt | null; type: DebtEntryType }>()

const toasts = useToasts()

const form = reactive({ date: todayIso(), amount: null as number | null, description: '' })
const amountText = ref('')
const errors = ref<Record<string, string>>({})
const formError = ref('')

const COPY = {
  cargo: { title: 'Anotar cargo', hint: 'Una compra, un interés, la cuota de manejo: sube la deuda', success: 'Cargo anotado', placeholder: 'Compra, interés, cuota de manejo…' },
  abono: { title: 'Anotar abono', hint: 'Un pago hecho por fuera del gasto fijo: baja la deuda', success: 'Abono anotado', placeholder: 'Abono extra, pago desde otra cuenta…' },
}
const copy = computed(() => COPY[props.type])

watch(open, (isOpen) => {
  if (!isOpen) return
  form.date = todayIso()
  form.amount = null
  amountText.value = ''
  form.description = ''
  errors.value = {}
  formError.value = ''
})

const save = useApiMutation((input: { id: number; body: DebtEntryInput }) => api.debts.addEntry(input.id, input.body), { silentError: true })

async function submit() {
  if (save.isPending.value || !props.debt) return
  errors.value = {}
  formError.value = ''
  const entry = amountEntry(amountText.value)
  if (entry !== 'ok' || form.amount == null) {
    errors.value.amount = entry === 'empty' ? 'Escribe el monto' : 'Eso no es un monto. Escribe solo el número, por ejemplo 85000 o 85k'
    return
  }
  const parsed = debtEntryInputSchema.safeParse({ date: form.date, type: props.type, amount: form.amount, description: form.description })
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? '')
      errors.value[field] ??= field === 'date' ? 'Elige una fecha' : issue.message
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
  toasts.success(copy.value.success)
  open.value = false
}

const VISIBLE_FIELDS = ['date', 'amount', 'description']
</script>

<template>
  <UiModal v-model:open="open" :title="`${copy.title} en ${debt?.name ?? ''}`" size="sm">
    <form id="debt-entry-form" class="flex flex-col gap-3" @submit.prevent="submit">
      <p class="text-xs text-muted">{{ copy.hint }}</p>

      <UiField label="Fecha" :error="errors.date">
        <input v-model="form.date" type="date" class="control" :aria-invalid="!!errors.date || undefined" />
      </UiField>

      <UiField label="Monto" :error="errors.amount" hint="Puedes escribir 85k o 1,2m">
        <UiMoneyInput v-model="form.amount" data-autofocus :invalid="!!errors.amount" @input="amountText = ($event.target as HTMLInputElement).value" />
      </UiField>

      <UiField label="Descripción" :error="errors.description">
        <input v-model="form.description" type="text" class="control" maxlength="120" :placeholder="copy.placeholder" />
      </UiField>

      <p v-if="formError" class="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger" role="alert">{{ formError }}</p>
    </form>

    <template #footer>
      <UiButton variant="ghost" @click="open = false">Cancelar</UiButton>
      <UiButton variant="primary" type="submit" form="debt-entry-form" :loading="save.isPending.value">Guardar</UiButton>
    </template>
  </UiModal>
</template>

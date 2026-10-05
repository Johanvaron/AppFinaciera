<script setup lang="ts">
/**
 * Detail of one debt: the four figures, the two "anotar" actions, the history
 * and the month-by-month table. On a phone it is a full sheet; on a desktop a
 * wide dialog with the history and the months side by side.
 */
import { computed, ref } from 'vue'
import { Minus, Plus } from 'lucide-vue-next'
import type { DebtEntryType, DebtMovement } from '@shared/contract'
import UiButton from '@/components/ui/UiButton.vue'
import UiModal from '@/components/ui/UiModal.vue'
import { api } from '@/lib/api'
import { dateShort, formatMoney } from '@/lib/format'
import { errorMessage, useApiMutation, useDebtDetail } from '@/lib/queries'
import DebtEntryModal from './DebtEntryModal.vue'
import DebtMonthly from './DebtMonthly.vue'
import DebtMovements from './DebtMovements.vue'
import { TONE_TEXT, balanceText, movementAmountText, movementText } from './debts'

const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ debtId: number | null }>()

const { data, isPending, isError, error, refetch, isFetching } = useDebtDetail(() => props.debtId)
const debt = computed(() => data.value?.debt ?? null)
const balance = computed(() => (debt.value ? balanceText(debt.value) : null))

// ---- write a charge / payment ----
const entryOpen = ref(false)
const entryType = ref<DebtEntryType>('cargo')
function openEntry(type: DebtEntryType) {
  entryType.value = type
  entryOpen.value = true
}

// ---- delete a hand-entered line ----
const removeOpen = ref(false)
const removing = ref<DebtMovement | null>(null)
const remove = useApiMutation((input: { debtId: number; entryId: number }) => api.debts.removeEntry(input.debtId, input.entryId), { success: 'Registro eliminado' })

function askRemove(movement: DebtMovement) {
  removing.value = movement
  removeOpen.value = true
}

async function confirmRemove() {
  const target = removing.value
  if (!target || target.entryId == null || props.debtId == null) return
  await remove.mutateAsync({ debtId: props.debtId, entryId: target.entryId }).then(() => (removeOpen.value = false), () => undefined)
}
</script>

<template>
  <UiModal v-model:open="open" :title="debt?.name ?? 'Deuda'" size="lg">
    <div v-if="isPending" class="flex flex-col gap-3" aria-busy="true">
      <span class="sr-only" role="status">Cargando la deuda…</span>
      <div class="h-16 animate-pulse rounded-lg bg-fill" />
      <div v-for="n in 4" :key="n" class="h-10 animate-pulse rounded-lg bg-fill" />
    </div>

    <div v-else-if="isError && !data" class="flex flex-col items-center gap-3 py-6 text-center" role="alert">
      <p class="font-medium">No se pudo cargar la deuda</p>
      <p class="text-xs text-muted">{{ errorMessage(error) }}</p>
      <UiButton :loading="isFetching" @click="refetch()">Reintentar</UiButton>
    </div>

    <div v-else-if="data && debt && balance" class="flex flex-col gap-4">
      <dl class="grid grid-cols-2 gap-3 rounded-lg bg-fill p-3 sm:grid-cols-4">
        <div class="min-w-0">
          <dt class="text-xs text-muted">Saldo actual</dt>
          <dd :class="['num text-[18px] font-semibold leading-tight', TONE_TEXT[balance.tone]]">{{ balance.text }}</dd>
        </div>
        <div class="min-w-0">
          <dt class="text-xs text-muted">Debías al inicio</dt>
          <dd class="num text-[14px] font-medium">{{ formatMoney(debt.initialBalance) }}</dd>
          <dd class="text-xs text-muted">{{ dateShort(debt.startDate) }}</dd>
        </div>
        <div class="min-w-0">
          <dt class="text-xs text-muted">Pagado en total</dt>
          <dd class="num text-[14px] font-medium text-success">{{ formatMoney(debt.paidTotal) }}</dd>
        </div>
        <div class="min-w-0">
          <dt class="text-xs text-muted">Cargos en total</dt>
          <dd class="num text-[14px] font-medium">{{ formatMoney(debt.chargedTotal) }}</dd>
        </div>
      </dl>
      <p v-if="debt.note" class="text-xs text-muted">{{ debt.note }}</p>

      <div class="flex flex-wrap gap-2">
        <UiButton @click="openEntry('cargo')">
          <Plus class="size-4" aria-hidden="true" />
          Anotar cargo
        </UiButton>
        <UiButton @click="openEntry('abono')">
          <Minus class="size-4" aria-hidden="true" />
          Anotar abono
        </UiButton>
      </div>

      <div class="grid grid-cols-1 gap-6 sm:grid-cols-[3fr_2fr]">
        <DebtMovements :movements="data.movements" :deleting="remove.isPending.value ? (removing?.entryId ?? null) : null" @remove="askRemove" />
        <DebtMonthly :monthly="data.monthly" />
      </div>
    </div>

    <DebtEntryModal v-model:open="entryOpen" :debt="debt" :type="entryType" />

    <UiModal v-model:open="removeOpen" title="Eliminar registro" size="sm">
      <p v-if="removing" class="text-[14px]">
        Se borra <span class="font-medium">{{ movementText(removing) }}</span> del {{ dateShort(removing.date) }}
        (<span class="num font-semibold">{{ movementAmountText(removing) }}</span>) y el saldo se recalcula.
      </p>
      <template #footer>
        <UiButton variant="ghost" data-autofocus @click="removeOpen = false">Cancelar</UiButton>
        <UiButton variant="danger" :loading="remove.isPending.value" @click="confirmRemove">Eliminar</UiButton>
      </template>
    </UiModal>
  </UiModal>
</template>

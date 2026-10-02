<script setup lang="ts">
/**
 * Monthly checklist of fixed expenses: replaces the owner's text note
 * ("Moto 600k ✅"). One row per fixed expense, a check to mark it paid.
 */
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { ListChecks, Plus } from 'lucide-vue-next'
import type { Category, FixedExpense, FixedMonthItem, FixedMonthOverrideInput } from '@shared/contract'
import PageHeader from '@/components/layout/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiModal from '@/components/ui/UiModal.vue'
import FixedFormModal from '@/components/fijos/FixedFormModal.vue'
import FixedRow, { type RowAction } from '@/components/fijos/FixedRow.vue'
import FixedTotals from '@/components/fijos/FixedTotals.vue'
import PayModal from '@/components/fijos/PayModal.vue'
import { moveId } from '@/components/fijos/fixed'
import { api } from '@/lib/api'
import { addMonths, formatMoney, monthLabel } from '@/lib/format'
import { errorMessage, useApiMutation, useCategories, useFixedMonth } from '@/lib/queries'
import { usePeriodStore } from '@/stores/period'
import { useToasts } from '@/lib/toasts'

const { month } = storeToRefs(usePeriodStore())
const toasts = useToasts()
const { data, isPending, isError, error, refetch, isFetching } = useFixedMonth(month)
const { data: categories } = useCategories()

const items = computed(() => data.value?.items ?? [])
const categoryById = computed(() => new Map<number, Category>((categories.value ?? []).map((c) => [c.id, c])))

// ---- dialogs ----
const formOpen = ref(false)
const formEditing = ref<FixedExpense | null>(null)
const payOpen = ref(false)
const unpayOpen = ref(false)
const removeOpen = ref(false)
/** Row the open pay / unpay / delete dialog is about. */
const target = ref<FixedMonthItem | null>(null)

function openForm(fixed: FixedExpense | null) {
  formEditing.value = fixed
  formOpen.value = true
}

function toggle(item: FixedMonthItem) {
  target.value = item
  if (item.status === 'paid') unpayOpen.value = true
  else payOpen.value = true
}

// ---- writes ----
// Every write takes the month from the ROW, not from the store: while a month
// change is loading the previous month's rows are still on screen.
const override = useApiMutation((input: { item: FixedMonthItem; body: FixedMonthOverrideInput }) => api.fixed.override(input.item.fixed.id, input.item.month, input.body))
const unpay = useApiMutation((item: FixedMonthItem) => api.fixed.unpay(item.fixed.id, item.month), { success: 'Pago borrado' })
const reorder = useApiMutation((ids: number[]) => api.fixed.reorder(ids))
const end = useApiMutation((item: FixedMonthItem) => api.fixed.update(item.fixed.id, { endMonth: item.month }))
const remove = useApiMutation((id: number) => api.fixed.remove(id), { success: 'Gasto fijo eliminado' })

function saveAmount(item: FixedMonthItem, value: number | null) {
  override.mutate({ item, body: { expectedAmount: value } })
}

function move(item: FixedMonthItem, direction: -1 | 1) {
  const ids = moveId(items.value.map((i) => i.fixed.id), item.fixed.id, direction)
  if (ids) reorder.mutate(ids)
}

function onAction(item: FixedMonthItem, action: RowAction) {
  if (action === 'edit') openForm(item.fixed)
  else if (action === 'skip') override.mutate({ item, body: { skipped: item.status !== 'skipped' } })
  else if (action === 'up') move(item, -1)
  else if (action === 'down') move(item, 1)
  else if (action === 'end') {
    end.mutate(item, { onSuccess: () => toasts.success(`${item.fixed.name} ya no aparece desde ${monthLabel(addMonths(item.month, 1)).toLowerCase()}`) })
  } else {
    target.value = item
    removeOpen.value = true
  }
}

async function confirmUnpay() {
  if (!target.value) return
  await unpay.mutateAsync(target.value).then(() => (unpayOpen.value = false), () => undefined)
}

async function confirmRemove() {
  if (!target.value) return
  await remove.mutateAsync(target.value.fixed.id).then(() => (removeOpen.value = false), () => undefined)
}
</script>

<template>
  <div class="page">
    <PageHeader title="Gastos fijos" :icon="ListChecks">
      <UiButton variant="primary" @click="openForm(null)">
        <Plus class="size-4" aria-hidden="true" />
        Agregar gasto fijo
      </UiButton>
    </PageHeader>

    <div v-if="isPending" class="flex flex-col gap-4" aria-busy="true">
      <span class="sr-only" role="status">Cargando gastos fijos…</span>
      <div class="grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 xl:grid-cols-4">
        <div v-for="n in 4" :key="n" class="h-[76px] animate-pulse rounded-card bg-fill" />
      </div>
      <div class="card flex flex-col gap-3">
        <div v-for="n in 6" :key="n" class="h-10 animate-pulse rounded-lg bg-fill" />
      </div>
    </div>

    <section v-else-if="isError && !data" class="card flex flex-col items-center gap-3 py-8 text-center" role="alert">
      <p class="font-medium">No se pudieron cargar los gastos fijos</p>
      <p class="text-xs text-muted">{{ errorMessage(error) }}</p>
      <UiButton :loading="isFetching" @click="refetch()">Reintentar</UiButton>
    </section>

    <template v-else-if="data">
      <section v-if="items.length === 0" class="card">
        <EmptyState
          :icon="ListChecks"
          :title="`No hay gastos fijos en ${monthLabel(data.month).toLowerCase()}`"
          text="Agrega lo que pagas todos los meses (arriendo, servicios, tarjetas). Se repiten solos cada mes y aquí los vas marcando a medida que los pagas. Los que ya tengas solo aparecen en los meses en que aplican."
        >
          <UiButton variant="primary" class="mt-2" @click="openForm(null)">
            <Plus class="size-4" aria-hidden="true" />
            Agregar gasto fijo
          </UiButton>
        </EmptyState>
      </section>

      <template v-else>
        <FixedTotals :totals="data.totals" />
        <section class="card py-2" :aria-label="`Gastos fijos de ${monthLabel(data.month)}`">
          <ul>
            <FixedRow
              v-for="(item, index) in items"
              :key="`${item.month}-${item.fixed.id}`"
              :item="item"
              :category="categoryById.get(item.fixed.categoryId)"
              :first="index === 0"
              :last="index === items.length - 1"
              @toggle="toggle(item)"
              @amount="saveAmount(item, $event)"
              @action="onAction(item, $event)"
            />
          </ul>
        </section>
      </template>
    </template>

    <FixedFormModal v-model:open="formOpen" :editing="formEditing" :month="month" />
    <PayModal v-model:open="payOpen" :item="target" />

    <UiModal v-model:open="unpayOpen" :title="`Desmarcar ${target?.fixed.name ?? ''}`" size="sm">
      <p class="text-[14px]">
        Se borra el pago de <span class="num font-semibold">{{ formatMoney(target?.paidAmount ?? 0) }}</span> y vuelve a quedar pendiente.
      </p>
      <template #footer>
        <UiButton variant="ghost" @click="unpayOpen = false">Cancelar</UiButton>
        <UiButton variant="danger" data-autofocus :loading="unpay.isPending.value" @click="confirmUnpay">Borrar el pago</UiButton>
      </template>
    </UiModal>

    <UiModal v-model:open="removeOpen" :title="`Eliminar ${target?.fixed.name ?? ''}`" size="sm">
      <p class="text-[14px]">
        Deja de aparecer en todos los meses. Los pagos que ya hiciste no se borran: quedan como movimientos normales.
      </p>
      <p class="mt-2 text-xs text-muted">Si solo quieres que no salga más de aquí en adelante, usa "Terminar desde el mes siguiente".</p>
      <template #footer>
        <UiButton variant="ghost" data-autofocus @click="removeOpen = false">Cancelar</UiButton>
        <UiButton variant="danger" :loading="remove.isPending.value" @click="confirmRemove">Eliminar</UiButton>
      </template>
    </UiModal>
  </div>
</template>

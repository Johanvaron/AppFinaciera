<script setup lang="ts">
/**
 * Credit cards and loans: what is owed today and how it goes down month by
 * month. A debt linked to a fixed expense goes down by itself with each
 * checklist payment; charges and extra payments are written by hand.
 */
import { computed, ref } from 'vue'
import { ChevronDown, CreditCard, Plus } from 'lucide-vue-next'
import type { Debt } from '@shared/contract'
import PageHeader from '@/components/layout/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiModal from '@/components/ui/UiModal.vue'
import DebtDetailModal from '@/components/deudas/DebtDetailModal.vue'
import DebtFormModal from '@/components/deudas/DebtFormModal.vue'
import DebtPayModal from '@/components/deudas/DebtPayModal.vue'
import DebtRow, { type RowAction } from '@/components/deudas/DebtRow.vue'
import DebtTotals from '@/components/deudas/DebtTotals.vue'
import { splitDebts } from '@/components/deudas/debts'
import { api } from '@/lib/api'
import { currentMonth } from '@/lib/format'
import { errorMessage, useApiMutation, useDebts, useFixedMonth } from '@/lib/queries'

const { data, isPending, isError, error, refetch, isFetching } = useDebts()
// The fixed expenses of THIS month (not the month on screen): the link is about what pays the debt now.
const { data: fixedMonth, isError: fixedError, refetch: refetchFixed } = useFixedMonth(currentMonth())

const sections = computed(() => splitDebts(data.value?.debts ?? []))
const fixedExpenses = computed(() => (fixedMonth.value?.items ?? []).map((item) => item.fixed))
const fixedNameById = computed(() => new Map(fixedExpenses.value.map((f) => [f.id, f.name])))
const archivedOpen = ref(false)

// ---- dialogs ----
const formOpen = ref(false)
const formEditing = ref<Debt | null>(null)
const detailOpen = ref(false)
const payOpen = ref(false)
const paying = ref<Debt | null>(null)
const detailId = ref<number | null>(null)
const removeOpen = ref(false)
const target = ref<Debt | null>(null)

function openForm(debt: Debt | null) {
  formEditing.value = debt
  formOpen.value = true
}

function openDetail(debt: Debt) {
  detailId.value = debt.id
  detailOpen.value = true
}

// ---- writes ----
// Two mutations so each one can carry its own success toast: the row only moves between sections, which is easy to miss.
const archive = useApiMutation((debt: Debt) => api.debts.update(debt.id, { archived: true }), { success: 'Deuda archivada' })
const restore = useApiMutation((debt: Debt) => api.debts.update(debt.id, { archived: false }), { success: 'Deuda restaurada' })
const remove = useApiMutation((id: number) => api.debts.remove(id), { success: 'Deuda eliminada' })

function onAction(debt: Debt, action: RowAction) {
  if (action === 'pay') {
    paying.value = debt
    payOpen.value = true
  } else if (action === 'edit') openForm(debt)
  else if (action === 'archive') (debt.archived ? restore : archive).mutate(debt)
  else {
    target.value = debt
    removeOpen.value = true
  }
}

async function confirmRemove() {
  if (!target.value) return
  await remove.mutateAsync(target.value.id).then(() => (removeOpen.value = false), () => undefined)
}
</script>

<template>
  <div class="page">
    <PageHeader title="Deudas" :icon="CreditCard" :month="false">
      <UiButton variant="primary" @click="openForm(null)">
        <Plus class="size-4" aria-hidden="true" />
        Agregar deuda
      </UiButton>
    </PageHeader>

    <div v-if="isPending" class="flex flex-col gap-4" aria-busy="true">
      <span class="sr-only" role="status">Cargando deudas…</span>
      <div class="grid grid-cols-1 gap-4 min-[520px]:grid-cols-3">
        <div v-for="n in 3" :key="n" class="h-[76px] animate-pulse rounded-card bg-fill" />
      </div>
      <div class="card flex flex-col gap-3">
        <div v-for="n in 4" :key="n" class="h-14 animate-pulse rounded-lg bg-fill" />
      </div>
    </div>

    <section v-else-if="isError && !data" class="card flex flex-col items-center gap-3 py-8 text-center" role="alert">
      <p class="font-medium">No se pudieron cargar las deudas</p>
      <p class="text-xs text-muted">{{ errorMessage(error) }}</p>
      <UiButton :loading="isFetching" @click="refetch()">Reintentar</UiButton>
    </section>

    <template v-else-if="data">
      <section v-if="data.debts.length === 0" class="card">
        <EmptyState
          :icon="CreditCard"
          title="Aún no registras deudas"
          text="Anota lo que debes de cada tarjeta o préstamo. Si la enlazas con su gasto fijo del checklist, cada pago del mes la descuenta sola."
        >
          <UiButton variant="primary" class="mt-2" @click="openForm(null)">
            <Plus class="size-4" aria-hidden="true" />
            Agregar deuda
          </UiButton>
        </EmptyState>
      </section>

      <template v-else>
        <DebtTotals :debts="data.debts" :paid-this-month="data.paidThisMonth" :active-count="sections.active.length" />

        <!-- Without the checklist the linked rows cannot name their fixed expense: say so instead of a generic line. -->
        <p v-if="fixedError && !fixedMonth" class="flex flex-wrap items-center gap-x-3 rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger" role="alert">
          <span>No se pudieron cargar los gastos fijos de este mes: no se ve cuál paga cada deuda.</span>
          <button type="button" class="font-semibold underline" @click="refetchFixed()">Reintentar</button>
        </p>

        <section class="card py-2" aria-label="Lista de deudas">
          <p v-if="sections.active.length === 0" class="py-3 text-xs text-muted">Todas tus deudas están archivadas.</p>
          <ul v-else class="[&>li+li]:shadow-[inset_0_1px_0_rgb(var(--fill))]">
            <DebtRow
              v-for="debt in sections.active"
              :key="debt.id"
              :debt="debt"
              :fixed-name="debt.fixedExpenseId == null ? undefined : fixedNameById.get(debt.fixedExpenseId)"
              @open="openDetail(debt)"
              @action="onAction(debt, $event)"
            />
          </ul>

          <template v-if="sections.archived.length > 0">
            <button
              type="button"
              class="mt-2 flex h-10 w-full items-center gap-2 rounded-lg px-2 text-left text-xs font-semibold text-muted hover:bg-fill sm:h-8"
              :aria-expanded="archivedOpen"
              @click="archivedOpen = !archivedOpen"
            >
              <ChevronDown :class="['size-4 transition-transform', archivedOpen && 'rotate-180']" aria-hidden="true" />
              Archivadas ({{ sections.archived.length }})
            </button>
            <ul v-if="archivedOpen" class="[&>li+li]:shadow-[inset_0_1px_0_rgb(var(--fill))]">
              <DebtRow
                v-for="debt in sections.archived"
                :key="debt.id"
                :debt="debt"
                :fixed-name="debt.fixedExpenseId == null ? undefined : fixedNameById.get(debt.fixedExpenseId)"
                @open="openDetail(debt)"
                @action="onAction(debt, $event)"
              />
            </ul>
          </template>
        </section>
      </template>
    </template>

    <DebtFormModal v-model:open="formOpen" :editing="formEditing" :fixed-expenses="fixedExpenses" :fixed-error="fixedError && !fixedMonth" @retry-fixed="refetchFixed()" />
    <DebtDetailModal v-model:open="detailOpen" :debt-id="detailId" />
    <DebtPayModal v-model:open="payOpen" :debt="paying" />

    <UiModal v-model:open="removeOpen" :title="`Eliminar ${target?.name ?? ''}`" size="sm">
      <p class="text-[14px]">Se borra la deuda con sus cargos y abonos anotados a mano.</p>
      <p class="mt-2 text-xs text-muted">El gasto fijo enlazado y los pagos que ya hiciste NO se borran: siguen en el checklist y en los movimientos.</p>
      <template #footer>
        <UiButton variant="ghost" data-autofocus @click="removeOpen = false">Cancelar</UiButton>
        <UiButton variant="danger" :loading="remove.isPending.value" @click="confirmRemove">Eliminar</UiButton>
      </template>
    </UiModal>
  </div>
</template>

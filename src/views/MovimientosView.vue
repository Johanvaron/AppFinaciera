<script setup lang="ts">
/** Every income, expense and transfer of the selected month: filter, sort, edit and bulk actions. */
import { computed, ref, watch } from 'vue'
import { refDebounced } from '@vueuse/core'
import { ArrowLeftRight, CircleAlert, Plus, SearchX } from 'lucide-vue-next'
import type { Transaction, TransactionType } from '@shared/contract'
import PageHeader from '@/components/layout/PageHeader.vue'
import MovimientosBulkBar from '@/components/movimientos/MovimientosBulkBar.vue'
import MovimientosFilters from '@/components/movimientos/MovimientosFilters.vue'
import MovimientosTable from '@/components/movimientos/MovimientosTable.vue'
import { categorizedText, countLabel, deleteResultText, deleteWarning, filteredTotals, removeEach, sortTransactions, type SortDir, type SortKey } from '@/components/movimientos/transactions'
import EmptyState from '@/components/ui/EmptyState.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiModal from '@/components/ui/UiModal.vue'
import { api, type TransactionFilters } from '@/lib/api'
import { formatMoney } from '@/lib/format'
import { errorMessage, useAccounts, useApiMutation, useCategories, useTransactions } from '@/lib/queries'
import { useToasts } from '@/lib/toasts'
import { usePeriodStore } from '@/stores/period'
import { useQuickAdd } from '@/stores/quickAdd'

const period = usePeriodStore()
const quickAdd = useQuickAdd()
const toasts = useToasts()

// ---------- filters ----------
const search = ref('')
const debouncedSearch = refDebounced(search, 250)
const type = ref<TransactionType | ''>('')
const categoryId = ref<number | null>(null)
const accountId = ref<number | null>(null)

const filtersActive = computed(() => search.value.trim() !== '' || type.value !== '' || categoryId.value != null || accountId.value != null)

function clearFilters() {
  search.value = ''
  type.value = ''
  categoryId.value = null
  accountId.value = null
}

const filters = computed<TransactionFilters>(() => {
  const query: TransactionFilters = { month: period.month }
  const q = debouncedSearch.value.trim()
  if (type.value) query.type = type.value
  if (categoryId.value != null) query.categoryId = categoryId.value
  if (accountId.value != null) query.accountId = accountId.value
  if (q) query.q = q
  return query
})

// ---------- data ----------
const { data: transactions, isLoading, isError, error, refetch, isFetching } = useTransactions(filters)
const { data: categories } = useCategories()
const { data: accounts } = useAccounts()

const categoryList = computed(() => categories.value ?? [])
const accountList = computed(() => accounts.value ?? [])
const categoryMap = computed(() => new Map(categoryList.value.map((c) => [c.id, c])))
const accountMap = computed(() => new Map(accountList.value.map((a) => [a.id, a])))

// ---------- sorting ----------
const sortKey = ref<SortKey>('date')
const sortDir = ref<SortDir>('desc')

function onSort(key: SortKey) {
  if (sortKey.value === key) sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc'
  else {
    sortKey.value = key
    sortDir.value = 'desc'
  }
}

const rows = computed(() => sortTransactions(transactions.value ?? [], sortKey.value, sortDir.value))
const totals = computed(() => filteredTotals(rows.value))

// ---------- selection ----------
const selectedIds = ref(new Set<number>())
/** Only what is on screen counts: a row hidden by a filter is never acted on. */
const selected = computed(() => rows.value.filter((tx) => selectedIds.value.has(tx.id)))

function toggle(id: number) {
  const next = new Set(selectedIds.value)
  if (!next.delete(id)) next.add(id)
  selectedIds.value = next
}

function toggleAll() {
  const everySelected = rows.value.length > 0 && selected.value.length === rows.value.length
  selectedIds.value = everySelected ? new Set() : new Set(rows.value.map((tx) => tx.id))
}

function clearSelection() {
  selectedIds.value = new Set()
}

watch(() => period.month, clearSelection)

// ---------- writes ----------
const categorize = useApiMutation(api.transactions.bulkCategorize)
// Resolves even when some deletes fail, so the cache is always refreshed with what really happened.
const removeMany = useApiMutation((ids: number[]) => removeEach(ids, api.transactions.remove))

function onCategorize(newCategoryId: number) {
  categorize.mutate(
    { ids: selected.value.map((tx) => tx.id), categoryId: newCategoryId },
    {
      // The server only changes movements of the category's kind and says how many.
      onSuccess: ({ updated }) => {
        clearSelection()
        if (updated > 0) toasts.success(categorizedText(updated))
        else toasts.error(categorizedText(updated))
      },
    },
  )
}

/** Rows waiting for the delete confirmation (one from its row action, or the whole selection). */
const toDelete = ref<Transaction[]>([])
const confirmOpen = computed({
  get: () => toDelete.value.length > 0,
  set: (isOpen) => {
    if (!isOpen) toDelete.value = []
  },
})
const warning = computed(() => deleteWarning(toDelete.value))

function confirmDelete() {
  const ids = toDelete.value.map((tx) => tx.id)
  removeMany.mutate(ids, {
    onSuccess: (result) => {
      toDelete.value = []
      clearSelection()
      if (result.failed > 0) toasts.error(deleteResultText(result))
      else toasts.success(deleteResultText(result))
    },
  })
}
</script>

<template>
  <div class="page">
    <PageHeader title="Movimientos" :icon="ArrowLeftRight">
      <UiButton variant="primary" @click="quickAdd.openNew()">
        <Plus class="size-4" aria-hidden="true" />
        Nuevo movimiento
      </UiButton>
    </PageHeader>

    <MovimientosFilters
      v-model:search="search"
      v-model:type="type"
      v-model:category-id="categoryId"
      v-model:account-id="accountId"
      :categories="categoryList"
      :accounts="accountList"
      :active="filtersActive"
      @clear="clearFilters"
    />

    <dl class="grid min-w-0 grid-cols-1 gap-x-6 gap-y-1 rounded-card bg-surface px-4 py-3 shadow-card sm:grid-cols-4" :aria-busy="isFetching">
      <div class="flex min-w-0 items-baseline justify-between gap-3 sm:flex-col sm:justify-start sm:gap-0">
        <dt class="text-xs font-medium text-muted">Ingresos</dt>
        <dd class="num text-[16px] font-semibold text-success sm:text-[18px]">{{ formatMoney(totals.income) }}</dd>
      </div>
      <div class="flex min-w-0 items-baseline justify-between gap-3 sm:flex-col sm:justify-start sm:gap-0">
        <dt class="text-xs font-medium text-muted">Gastos</dt>
        <dd class="num text-[16px] font-semibold sm:text-[18px]">{{ formatMoney(totals.expenses) }}</dd>
      </div>
      <div class="flex min-w-0 items-baseline justify-between gap-3 sm:flex-col sm:justify-start sm:gap-0">
        <dt class="text-xs font-medium text-muted">Neto</dt>
        <dd :class="['num text-[16px] font-semibold sm:text-[18px]', totals.net < 0 && 'text-danger']">{{ formatMoney(totals.net) }}</dd>
      </div>
      <div class="flex min-w-0 items-baseline justify-between gap-3 sm:flex-col sm:justify-start sm:gap-0">
        <dt class="text-xs font-medium text-muted">{{ filtersActive ? 'Con estos filtros' : 'En el mes' }}</dt>
        <dd class="num text-[16px] font-semibold sm:text-[18px]">{{ countLabel(totals.count) }}</dd>
      </div>
    </dl>

    <section class="card flex min-w-0 flex-col gap-3" aria-label="Lista de movimientos">
      <p v-if="isLoading" class="py-8 text-center text-xs text-muted" role="status">Cargando movimientos…</p>

      <EmptyState v-else-if="isError" :icon="CircleAlert" title="No se pudieron cargar los movimientos" :text="errorMessage(error)">
        <UiButton @click="refetch()">Reintentar</UiButton>
      </EmptyState>

      <EmptyState v-else-if="rows.length === 0 && filtersActive" :icon="SearchX" title="Ningún movimiento coincide" text="Prueba con otra búsqueda o quita algún filtro.">
        <UiButton @click="clearFilters">Limpiar filtros</UiButton>
      </EmptyState>

      <EmptyState
        v-else-if="rows.length === 0"
        :icon="ArrowLeftRight"
        :title="`Sin movimientos en ${period.label.toLowerCase()}`"
        text="Registra tu primer ingreso o gasto del mes. También puedes presionar la tecla N desde cualquier pantalla."
      >
        <UiButton variant="primary" @click="quickAdd.openNew()">
          <Plus class="size-4" aria-hidden="true" />
          Nuevo movimiento
        </UiButton>
      </EmptyState>

      <template v-else>
        <MovimientosBulkBar
          v-if="selected.length > 0"
          :selected="selected"
          :categories="categoryList"
          :busy="categorize.isPending.value || removeMany.isPending.value"
          @categorize="onCategorize"
          @remove="toDelete = selected"
          @clear="clearSelection"
        />
        <MovimientosTable
          :rows="rows"
          :categories="categoryMap"
          :accounts="accountMap"
          :selected-ids="selectedIds"
          :sort-key="sortKey"
          :sort-dir="sortDir"
          @sort="onSort"
          @toggle="toggle"
          @toggle-all="toggleAll"
          @edit="quickAdd.openEdit($event)"
          @remove="toDelete = [$event]"
        />
      </template>
    </section>

    <UiModal v-model:open="confirmOpen" :title="toDelete.length > 1 ? 'Eliminar movimientos' : 'Eliminar movimiento'" size="sm">
      <div class="flex flex-col gap-2 text-[14px]">
        <p>{{ warning.question }}</p>
        <p v-if="warning.fixedNotice" class="rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">{{ warning.fixedNotice }}</p>
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="confirmOpen = false">Cancelar</UiButton>
        <UiButton variant="danger" :loading="removeMany.isPending.value" @click="confirmDelete">Eliminar</UiButton>
      </template>
    </UiModal>
  </div>
</template>

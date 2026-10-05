<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { ChartColumn, Plus } from 'lucide-vue-next'
import type { CategoryKind } from '@shared/contract'
import PageHeader from '@/components/layout/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import UiButton from '@/components/ui/UiButton.vue'
import CategoryMatrix from '@/components/reportes/CategoryMatrix.vue'
import CategoryTrend from '@/components/reportes/CategoryTrend.vue'
import IncomeExpenseChart from '@/components/reportes/IncomeExpenseChart.vue'
import RangeTotals from '@/components/reportes/RangeTotals.vue'
import SegmentedControl from '@/components/reportes/SegmentedControl.vue'
import { deriveRange, isEmptyRange, RANGE_OPTIONS, type RangeKey } from '@/components/reportes/reports'
import { currentMonth, monthLabel } from '@/lib/format'
import { errorMessage, useCategoryReport, useMonthlyReport } from '@/lib/queries'
import { useQuickAdd } from '@/stores/quickAdd'

const quickAdd = useQuickAdd()

const rangeKey = ref<RangeKey>('6')
const kind = ref<CategoryKind>('expense')
const selectedId = ref<number | null>(null)

// Reports always end in the real current month, not in the global selected one.
const range = computed(() => deriveRange(rangeKey.value, currentMonth()))
const subtitle = computed(() =>
  range.value.months === 1 ? monthLabel(range.value.to) : `${monthLabel(range.value.from)} a ${monthLabel(range.value.to)}`,
)

const monthly = useMonthlyReport(() => ({ months: range.value.months, until: range.value.to }))
const categories = useCategoryReport(() => ({ from: range.value.from, to: range.value.to, kind: kind.value }))

const rows = computed(() => monthly.data.value ?? [])
const isEmpty = computed(() => isEmptyRange(rows.value))
// A failed background refetch keeps the cached report on screen: the error only replaces it when there is nothing to show.
const monthlyFailed = computed(() => monthly.isError.value && !monthly.data.value)
const categoriesError = computed(() => (categories.isError.value && !categories.data.value ? errorMessage(categories.error.value) : null))
// The cached figures stay, but never as if they were current: the failed refresh is said above them.
const staleMessage = computed(() => {
  if (monthly.isError.value && monthly.data.value) return errorMessage(monthly.error.value)
  if (categories.isError.value && categories.data.value) return errorMessage(categories.error.value)
  return null
})
const retrying = computed(() => monthly.isFetching.value || categories.isFetching.value)

function retryAll() {
  void monthly.refetch()
  void categories.refetch()
}

const selectedRow = computed(() => categories.data.value?.rows.find((row) => row.category.id === selectedId.value) ?? null)

// The trend opens under the matrix, often below the fold: bring it into view when a category is chosen.
const trendBox = ref<HTMLElement | null>(null)
watch(selectedId, async (id) => {
  if (id === null) return
  await nextTick()
  trendBox.value?.scrollIntoView({ block: 'nearest' })
})

watch(kind, () => (selectedId.value = null))
// A category that is not in the new range lets go of the selection, so its trend does not come back by itself later.
watch(
  () => categories.data.value,
  (report) => {
    if (report && selectedId.value !== null && !selectedRow.value) selectedId.value = null
  },
)
</script>

<template>
  <div class="page">
    <PageHeader title="Reportes" :subtitle="subtitle" :icon="ChartColumn" :month="false" />

    <div class="flex flex-wrap items-center gap-2">
      <SegmentedControl v-model="rangeKey" :options="RANGE_OPTIONS" label="Rango de meses" />
    </div>

    <div v-if="staleMessage" role="alert" class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-warning-soft px-3 py-2">
      <p class="min-w-0 flex-1 basis-64 text-ink">{{ staleMessage }} Estás viendo los últimos datos cargados.</p>
      <UiButton :loading="retrying" @click="retryAll">Reintentar</UiButton>
    </div>

    <p v-if="monthly.isPending.value" class="card py-10 text-center text-muted">Cargando reportes…</p>

    <div v-else-if="monthlyFailed" class="card flex flex-col items-center gap-3 py-8 text-center">
      <p class="text-danger">{{ errorMessage(monthly.error.value) }}</p>
      <UiButton @click="monthly.refetch()">Reintentar</UiButton>
    </div>

    <div v-else-if="isEmpty" class="card">
      <EmptyState
        :icon="ChartColumn"
        title="Aún no hay datos para comparar"
        text="Los reportes se llenan a medida que registras movimientos. Prueba con un rango más amplio o registra tu primer movimiento."
      >
        <UiButton variant="primary" class="mt-2" @click="quickAdd.openNew()">
          <Plus class="size-4" aria-hidden="true" />
          Nuevo movimiento
        </UiButton>
      </EmptyState>
    </div>

    <template v-else>
      <!-- While the new range loads these are still the figures of the previous one: dimmed, like the matrix. -->
      <div
        data-test="range-summary"
        :class="['flex min-w-0 flex-col gap-4 transition-opacity', monthly.isPlaceholderData.value ? 'opacity-50' : '']"
        :aria-busy="monthly.isPlaceholderData.value"
      >
        <RangeTotals :rows="rows" />
        <IncomeExpenseChart :rows="rows" />
      </div>
      <CategoryMatrix
        v-model:kind="kind"
        v-model:selected-id="selectedId"
        :report="categories.data.value"
        :loading="categories.isPending.value"
        :stale="categories.isPlaceholderData.value"
        :error="categoriesError"
        @retry="categories.refetch()"
      />
      <!-- The scroll margin clears the bottom tab bar on phones. Dimmed while it still shows the previous range. -->
      <div
        v-if="selectedRow && categories.data.value"
        ref="trendBox"
        :class="['min-w-0 scroll-mb-24 transition-opacity lg:scroll-mb-4', categories.isPlaceholderData.value ? 'opacity-50' : '']"
        :aria-busy="categories.isPlaceholderData.value"
      >
        <CategoryTrend :row="selectedRow" :months="categories.data.value.months" @close="selectedId = null" />
      </div>
    </template>
  </div>
</template>

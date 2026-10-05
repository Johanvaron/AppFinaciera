<script setup lang="ts">
import { computed } from 'vue'
import type { CategoryKind, CategoryReport } from '@shared/contract'
import UiButton from '@/components/ui/UiButton.vue'
import { monthShort } from '@/lib/format'
import { categoryHex } from '@/lib/palette'
import SegmentedControl from './SegmentedControl.vue'
import { cellText, matrixFooter, maxCellIndex } from './reports'

const props = defineProps<{
  report: CategoryReport | undefined
  loading: boolean
  /** The report on screen belongs to the previous kind or range while the new one loads. */
  stale: boolean
  error: string | null
}>()
defineEmits<{ retry: [] }>()

const kind = defineModel<CategoryKind>('kind', { required: true })
/** Category whose trend is open; clicking the same row again closes it. */
const selectedId = defineModel<number | null>('selectedId', { required: true })

const KIND_OPTIONS: { value: CategoryKind; label: string }[] = [
  { value: 'expense', label: 'Gastos' },
  { value: 'income', label: 'Ingresos' },
]

const rows = computed(() => (props.report?.rows ?? []).map((row) => ({ ...row, peakIndex: maxCellIndex(row.totals) })))
const footer = computed(() => (props.report ? matrixFooter(props.report) : null))

function toggle(id: number) {
  if (props.stale) return
  selectedId.value = selectedId.value === id ? null : id
}
</script>

<template>
  <section class="card flex min-w-0 flex-col gap-3">
    <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div class="min-w-0 flex-1 basis-60">
        <h2 class="font-semibold">{{ kind === 'expense' ? 'Gasto por categoría' : 'Ingreso por categoría' }}</h2>
        <p class="text-xs text-muted">Elige una categoría para ver su tendencia. El mes más alto de cada una va resaltado.</p>
      </div>
      <SegmentedControl v-model="kind" :options="KIND_OPTIONS" label="Tipo de categoría" />
    </div>

    <div v-if="error" class="flex flex-wrap items-center gap-3 py-4">
      <p class="min-w-0 flex-1 text-danger">{{ error }}</p>
      <UiButton @click="$emit('retry')">Reintentar</UiButton>
    </div>
    <!-- An empty previous report says nothing about the new kind or range: it is still loading, not empty. -->
    <p v-else-if="(!report && loading) || (stale && !rows.length)" class="py-6 text-center text-muted">Cargando categorías…</p>
    <p v-else-if="!rows.length" class="py-6 text-center text-muted">
      {{ kind === 'expense' ? 'No hay gastos en este rango.' : 'No hay ingresos en este rango.' }}
    </p>

    <div v-else-if="report && footer" :class="['table-wrap transition-opacity', stale ? 'pointer-events-none opacity-50' : '']" :aria-busy="stale">
      <table class="table">
        <thead>
          <tr>
            <th scope="col" class="sticky left-0 z-10">Categoría</th>
            <th v-for="month in report.months" :key="month" scope="col" class="!text-right">{{ monthShort(month) }}</th>
            <th scope="col" class="!text-right">Total</th>
            <th scope="col" class="!text-right">Promedio</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.category.id" class="group cursor-pointer" @click="toggle(row.category.id)">
            <td class="sticky left-0 z-10 bg-surface">
              <button
                type="button"
                class="flex max-w-[42vw] items-center gap-2 rounded text-left sm:max-w-none"
                :disabled="stale"
                :aria-pressed="selectedId === row.category.id"
                :aria-label="`Ver tendencia de ${row.category.name}`"
                @click.stop="toggle(row.category.id)"
              >
                <span class="size-2.5 shrink-0 rounded-full" :style="{ backgroundColor: categoryHex(row.category.color) }" aria-hidden="true" />
                <span :class="['min-w-0 truncate group-hover:text-primary', selectedId === row.category.id ? 'font-semibold text-primary' : '']">
                  {{ row.category.name }}
                </span>
              </button>
            </td>
            <td v-for="(value, index) in row.totals" :key="report.months[index] ?? index" class="text-right">
              <span :class="['num inline-block rounded-md px-1.5 py-0.5', index === row.peakIndex ? 'bg-fill font-medium' : '', value === 0 ? 'text-muted' : '']">
                {{ cellText(value) }}
              </span>
            </td>
            <td class="num text-right font-medium">{{ cellText(row.total) }}</td>
            <td :class="['num text-right', row.average === 0 ? 'text-muted' : '']">{{ cellText(row.average) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="font-semibold">
            <td class="sticky left-0 z-10 rounded-l-lg bg-fill">Total</td>
            <td v-for="(value, index) in footer.totals" :key="report.months[index] ?? index" class="num bg-fill text-right">
              <span class="px-1.5">{{ cellText(value) }}</span>
            </td>
            <td class="num bg-fill text-right">{{ cellText(footer.total) }}</td>
            <td class="num rounded-r-lg bg-fill text-right">{{ cellText(footer.average) }}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </section>
</template>

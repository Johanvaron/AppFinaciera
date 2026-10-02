<script setup lang="ts">
/**
 * The movements themselves: a dense table from 640px up and a list of
 * card-rows on phones. Day separators only show when sorted by date.
 */
import { computed } from 'vue'
import { ArrowDown, ArrowUp, ArrowUpDown, Pencil, Trash2 } from 'lucide-vue-next'
import type { Account, Category, Transaction } from '@shared/contract'
import UiBadge from '@/components/ui/UiBadge.vue'
import { formatMoney } from '@/lib/format'
import { categoryHex } from '@/lib/palette'
import { groupByDay, rowView, type RowView, type SortDir, type SortKey } from './transactions'

const props = defineProps<{
  /** Already sorted. */
  rows: Transaction[]
  categories: Map<number, Category>
  accounts: Map<number, Account>
  selectedIds: Set<number>
  sortKey: SortKey
  sortDir: SortDir
}>()

const emit = defineEmits<{
  sort: [key: SortKey]
  toggle: [id: number]
  toggleAll: []
  edit: [tx: Transaction]
  remove: [tx: Transaction]
}>()

type Line =
  | { kind: 'day'; key: string; label: string; spent: number }
  | { kind: 'row'; key: string; tx: Transaction; view: RowView }

const lines = computed<Line[]>(() => {
  const toRow = (tx: Transaction): Line => ({ kind: 'row', key: `tx-${tx.id}`, tx, view: rowView(tx, props.categories, props.accounts) })
  if (props.sortKey !== 'date') return props.rows.map(toRow)
  return groupByDay(props.rows).flatMap((group) => [{ kind: 'day', key: `day-${group.date}`, label: group.label, spent: group.spent } as Line, ...group.items.map(toRow)])
})

const allSelected = computed(() => props.rows.length > 0 && props.rows.every((tx) => props.selectedIds.has(tx.id)))
const someSelected = computed(() => !allSelected.value && props.rows.some((tx) => props.selectedIds.has(tx.id)))

function ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
  if (props.sortKey !== key) return 'none'
  return props.sortDir === 'asc' ? 'ascending' : 'descending'
}

function sortIcon(key: SortKey) {
  if (props.sortKey !== key) return ArrowUpDown
  return props.sortDir === 'asc' ? ArrowUp : ArrowDown
}
</script>

<template>
  <!-- 640px and up: table -->
  <div class="table-wrap hidden sm:block">
    <table class="table min-w-[760px]">
      <thead>
        <tr>
          <th class="w-9">
            <input type="checkbox" class="size-4 align-middle accent-primary" aria-label="Seleccionar todo lo visible" :checked="allSelected" :indeterminate="someSelected" @change="emit('toggleAll')" />
          </th>
          <th :aria-sort="ariaSort('date')">
            <button type="button" class="inline-flex items-center gap-1 hover:text-ink" @click="emit('sort', 'date')">
              Fecha
              <component :is="sortIcon('date')" class="size-3.5" aria-hidden="true" />
            </button>
          </th>
          <th>Descripción</th>
          <th>Categoría</th>
          <th>Cuenta</th>
          <th class="!text-right" :aria-sort="ariaSort('amount')">
            <button type="button" class="inline-flex items-center gap-1 hover:text-ink" @click="emit('sort', 'amount')">
              Monto
              <component :is="sortIcon('amount')" class="size-3.5" aria-hidden="true" />
            </button>
          </th>
          <th class="w-20"><span class="sr-only">Acciones</span></th>
        </tr>
      </thead>
      <tbody>
        <template v-for="line in lines" :key="line.key">
          <tr v-if="line.kind === 'day'">
            <td colspan="7" class="!pb-1 !pt-3 text-xs font-semibold text-muted">
              <div class="flex items-center justify-between gap-3">
                <span>{{ line.label }}</span>
                <span v-if="line.spent > 0" class="num font-medium">Gastado {{ formatMoney(line.spent) }}</span>
              </div>
            </td>
          </tr>
          <tr v-else :class="['hover:bg-fill/50', selectedIds.has(line.tx.id) && 'bg-primary-soft/50']" @dblclick="emit('edit', line.tx)">
            <td>
              <input type="checkbox" class="size-4 align-middle accent-primary" :aria-label="`Seleccionar ${line.view.title}`" :checked="selectedIds.has(line.tx.id)" @change="emit('toggle', line.tx.id)" @dblclick.stop />
            </td>
            <td class="whitespace-nowrap text-muted">{{ line.view.dateText }}</td>
            <td class="w-full max-w-0">
              <div class="flex min-w-0 items-center gap-2">
                <span class="truncate font-medium">{{ line.view.title }}</span>
                <UiBadge v-if="line.view.isFixed">Fijo</UiBadge>
              </div>
              <p v-if="line.view.note" class="truncate text-xs text-muted">{{ line.view.note }}</p>
            </td>
            <td class="whitespace-nowrap">
              <span class="inline-flex items-center gap-2" :class="line.view.categoryColor ? '' : 'text-muted'">
                <span v-if="line.view.categoryColor" class="size-2 shrink-0 rounded-full" :style="{ backgroundColor: categoryHex(line.view.categoryColor) }" aria-hidden="true" />
                {{ line.view.categoryName }}
              </span>
            </td>
            <td class="whitespace-nowrap text-muted">{{ line.view.accountText }}</td>
            <td :class="['num text-right font-medium', line.view.amountClass]">{{ line.view.amountText }}</td>
            <td>
              <div class="flex justify-end gap-1" @dblclick.stop>
                <button type="button" class="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-fill hover:text-ink" :aria-label="`Editar ${line.view.title}`" @click="emit('edit', line.tx)">
                  <Pencil class="size-4" aria-hidden="true" />
                </button>
                <button type="button" class="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger" :aria-label="`Eliminar ${line.view.title}`" @click="emit('remove', line.tx)">
                  <Trash2 class="size-4" aria-hidden="true" />
                </button>
              </div>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>

  <!-- Phones: card-rows, tap to edit, trash to delete -->
  <ul class="flex min-w-0 flex-col sm:hidden">
    <template v-for="line in lines" :key="line.key">
      <li v-if="line.kind === 'day'" class="flex items-center justify-between gap-3 rounded-lg bg-fill px-2 py-1.5 text-xs font-semibold text-muted">
        <span class="min-w-0 truncate">{{ line.label }}</span>
        <span v-if="line.spent > 0" class="num font-medium">Gastado {{ formatMoney(line.spent) }}</span>
      </li>
      <li v-else class="flex min-w-0 items-center gap-1">
        <button type="button" class="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-fill/50" :aria-label="`Editar ${line.view.title}`" @click="emit('edit', line.tx)">
          <span class="min-w-0 flex-1">
            <span class="flex min-w-0 items-center gap-2">
              <span class="truncate font-medium">{{ line.view.title }}</span>
              <UiBadge v-if="line.view.isFixed">Fijo</UiBadge>
            </span>
            <span class="flex min-w-0 items-center gap-1.5 text-xs text-muted">
              <span v-if="line.view.categoryColor" class="size-2 shrink-0 rounded-full" :style="{ backgroundColor: categoryHex(line.view.categoryColor) }" aria-hidden="true" />
              <span class="truncate">{{ line.view.categoryColor ? `${line.view.categoryName} · ${line.view.accountText}` : line.view.accountText }}</span>
            </span>
          </span>
          <span class="shrink-0 text-right">
            <span :class="['num block font-medium', line.view.amountClass]">{{ line.view.amountText }}</span>
            <span class="block text-xs text-muted">{{ line.view.dateText }}</span>
          </span>
        </button>
        <!-- Phones have no selection bar: this is the only way to delete there (asks for confirmation). -->
        <button type="button" class="flex size-10 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger" :aria-label="`Eliminar ${line.view.title}`" @click="emit('remove', line.tx)">
          <Trash2 class="size-4" aria-hidden="true" />
        </button>
      </li>
    </template>
  </ul>
</template>

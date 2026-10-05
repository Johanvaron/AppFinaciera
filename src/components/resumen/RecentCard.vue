<script setup lang="ts">
/** Latest movements; a click opens the single movement modal to edit it. */
import { computed } from 'vue'
import type { Category, Transaction } from '@shared/contract'
import { dateShort } from '@/lib/format'
import { categoryHex } from '@/lib/palette'
import { useQuickAdd } from '@/stores/quickAdd'
import CardHeader from './CardHeader.vue'
import { signedAmount, transactionTitle } from './summary'

const props = defineProps<{ transactions: Transaction[]; categories: Category[] }>()
const quickAdd = useQuickAdd()

const rows = computed(() => {
  const byId = new Map(props.categories.map((category) => [category.id, category]))
  return props.transactions.map((tx) => {
    const category = tx.categoryId == null ? undefined : byId.get(tx.categoryId)
    const title = transactionTitle(tx, category)
    const amount = signedAmount(tx)
    // The category goes next to the date only when the title is not already its name.
    const meta = category && title !== category.name ? `${dateShort(tx.date)} · ${category.name}` : dateShort(tx.date)
    return { tx, title, amount, meta, color: categoryHex(category?.color) }
  })
})
</script>

<template>
  <section class="card flex min-w-0 flex-col gap-3">
    <CardHeader title="Últimos movimientos" to="/movimientos" link-label="Ver todos" />
    <ul v-if="rows.length" class="-mx-2 flex flex-col">
      <li v-for="row in rows" :key="row.tx.id">
        <button
          type="button"
          class="flex w-full min-w-0 items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-fill"
          :aria-label="`Editar movimiento: ${row.title}, ${row.amount.text}`"
          @click="quickAdd.openEdit(row.tx)"
        >
          <span class="size-2.5 shrink-0 rounded-full" :style="{ backgroundColor: row.color }" aria-hidden="true" />
          <span class="min-w-0 flex-1">
            <span class="block truncate text-[14px] font-medium">{{ row.title }}</span>
            <span class="block truncate text-xs text-muted">{{ row.meta }}</span>
          </span>
          <span :class="['num shrink-0 text-[14px] font-semibold', row.amount.className]">{{ row.amount.text }}</span>
        </button>
      </li>
    </ul>
    <p v-else class="py-6 text-center text-[14px] text-muted">Aún no hay movimientos este mes</p>
  </section>
</template>

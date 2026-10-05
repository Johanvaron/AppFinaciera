<script setup lang="ts">
/** Where the money went: plain HTML bars, biggest category first. */
import { computed } from 'vue'
import { Plus, Receipt } from 'lucide-vue-next'
import type { CategoryTotal } from '@shared/contract'
import EmptyState from '@/components/ui/EmptyState.vue'
import UiButton from '@/components/ui/UiButton.vue'
import { categoryHex } from '@/lib/palette'
import { useQuickAdd } from '@/stores/quickAdd'
import CardHeader from './CardHeader.vue'
import { categoryBars } from './summary'

const props = defineProps<{ totals: CategoryTotal[] }>()
const quickAdd = useQuickAdd()

const bars = computed(() =>
  categoryBars(props.totals).map((bar) => ({
    ...bar,
    // "Otras" has no category: categoryHex falls back to slate.
    color: categoryHex(bar.category?.color),
    width: `${Math.max(bar.ratio * 100, 1)}%`,
  })),
)
</script>

<template>
  <section class="card flex min-w-0 flex-col gap-3">
    <CardHeader title="En qué se fue la plata" />
    <ul v-if="bars.length" class="flex flex-col gap-3">
      <li v-for="bar in bars" :key="bar.key" class="flex min-w-0 flex-col gap-1">
        <div class="flex min-w-0 items-baseline justify-between gap-3">
          <span class="flex min-w-0 items-center gap-2">
            <span class="size-2.5 shrink-0 rounded-full" :style="{ backgroundColor: bar.color }" aria-hidden="true" />
            <span class="truncate text-[14px]">{{ bar.name }}</span>
          </span>
          <span class="flex shrink-0 items-baseline gap-2">
            <span class="num text-[14px] font-semibold">{{ bar.amountText }}</span>
            <span class="num w-11 text-right text-xs text-muted">{{ bar.shareText }}</span>
          </span>
        </div>
        <div class="h-2 w-full overflow-hidden rounded-full bg-fill" aria-hidden="true">
          <div class="h-full rounded-full" :style="{ width: bar.width, backgroundColor: bar.color }" />
        </div>
      </li>
    </ul>
    <EmptyState v-else :icon="Receipt" title="Aún no hay gastos este mes">
      <UiButton variant="primary" @click="quickAdd.openNew()">
        <Plus class="size-4" aria-hidden="true" />
        Nuevo movimiento
      </UiButton>
    </EmptyState>
  </section>
</template>

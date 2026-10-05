<script setup lang="ts">
/**
 * Month by month since the start: paid, charged and the closing balance as a
 * plain HTML bar, so the debt can be seen going down without a chart library.
 */
import type { DebtMonthRow } from '@shared/contract'
import { formatMoney, monthLabel } from '@/lib/format'
import { balanceText, monthBarRatio } from './debts'

defineProps<{ monthly: DebtMonthRow[] }>()
</script>

<template>
  <section class="min-w-0">
    <h3 class="text-xs font-semibold text-muted">Mes a mes</h3>
    <ul class="mt-1 flex flex-col">
      <li v-for="row in monthly" :key="row.month" class="py-2 [&+li]:shadow-[inset_0_1px_0_rgb(var(--fill))]">
        <div class="flex items-center justify-between gap-2">
          <span class="truncate text-[14px] font-medium">{{ monthLabel(row.month) }}</span>
          <!-- Ink while it is owed (the bar already shows it going down); green when paid or in favor. -->
          <span :class="['num text-[14px] font-semibold', row.balanceEnd > 0 ? 'text-ink' : 'text-success']">
            {{ row.balanceEnd > 0 ? formatMoney(row.balanceEnd) : balanceText({ balance: row.balanceEnd }).text }}
          </span>
        </div>
        <div class="mt-1 h-2 w-full overflow-hidden rounded-full bg-fill" aria-hidden="true">
          <div class="h-full rounded-full bg-danger/70" :style="{ width: `${Math.round(monthBarRatio(row, monthly) * 100)}%` }" />
        </div>
        <p class="mt-1 flex flex-wrap justify-between gap-x-3 text-xs text-muted">
          <span>Pagado <span class="num text-success">{{ formatMoney(row.paid) }}</span></span>
          <span>Cargos <span class="num">{{ formatMoney(row.charged) }}</span></span>
        </p>
      </li>
    </ul>
  </section>
</template>

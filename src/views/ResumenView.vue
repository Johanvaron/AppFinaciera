<script setup lang="ts">
/** The month at a glance: what is left to spend, the pace, what is due and where the money went. */
import { computed } from 'vue'
import { ArrowDownLeft, ArrowUpRight, CalendarClock, LayoutDashboard, PiggyBank, TriangleAlert, Wallet, Landmark } from 'lucide-vue-next'
import PageHeader from '@/components/layout/PageHeader.vue'
import AccountsCard from '@/components/resumen/AccountsCard.vue'
import CategoryBarsCard from '@/components/resumen/CategoryBarsCard.vue'
import PaceCard from '@/components/resumen/PaceCard.vue'
import RecentCard from '@/components/resumen/RecentCard.vue'
import UpcomingCard from '@/components/resumen/UpcomingCard.vue'
import WelcomeCard from '@/components/resumen/WelcomeCard.vue'
import { availableStat, balanceStat, changeDetail, fixedStat, monthNameLower, savingsStat, screenState } from '@/components/resumen/summary'
import StatCard from '@/components/ui/StatCard.vue'
import UiButton from '@/components/ui/UiButton.vue'
import { formatMoney } from '@/lib/format'
import { errorMessage, useCategories, useFixedMonth, useSummary } from '@/lib/queries'
import { usePeriodStore } from '@/stores/period'

const period = usePeriodStore()
const { data: summary, isPending, isError, error, refetch, isFetching, isPlaceholderData } = useSummary(() => period.month)
const { data: categories } = useCategories()
// The summary only lists UNPAID fixed expenses; the checklist tells whether there are any at all.
const {
  data: fixedMonth,
  isError: fixedIsError,
  error: fixedError,
  refetch: refetchFixed,
  isFetching: fixedIsFetching,
  isPlaceholderData: fixedIsPlaceholder,
} = useFixedMonth(() => period.month)

/** Skeleton, welcome or board, and what is known about the fixed expenses of the month on screen. */
const state = computed(() => screenState(summary.value, { data: fixedMonth.value, isPlaceholder: fixedIsPlaceholder.value, isError: fixedIsError.value }))
const hasAccounts = computed(() => (summary.value?.accounts ?? []).some((account) => !account.archived))

/**
 * Figures row. Two lead figures (what is free to spend, what is in the bank)
 * and four smaller ones. Every card keeps room for a 9-digit or negative figure
 * without truncating: one column on narrow phones, two from 500px, 3+3 / 3+3 /
 * 3+3 on a 6-column grid from md, 6+6 / 3+3+3+3 on 12 columns from lg, six
 * across at 2xl.
 * No styling reaches inside StatCard.
 */
const STAT_SPANS = {
  lead: 'min-[500px]:col-span-2 md:col-span-3 lg:col-span-6 2xl:col-span-1',
  third: 'md:col-span-3 lg:col-span-3 2xl:col-span-1',
}

const stats = computed(() => {
  const s = summary.value
  if (!s) return null
  return {
    available: availableStat(s.availableToSpend),
    balance: balanceStat(s.totalBalance, s.accounts.length),
    income: { value: formatMoney(s.income), detail: changeDetail(s.change.income, s.month, s.previous.month) },
    expenses: { value: formatMoney(s.expenses), detail: changeDetail(s.change.expenses, s.month, s.previous.month) },
    fixed: fixedStat(s.pendingFixed, s.upcomingFixed.length, state.value.fixedCount),
    savings: savingsStat(s.net, s.savingsRate),
  }
})
</script>

<template>
  <div class="page">
    <PageHeader title="Resumen" :icon="LayoutDashboard" />

    <div v-if="isError && !summary" class="card flex flex-col items-center gap-3 py-8 text-center" role="alert">
      <span class="flex size-10 items-center justify-center rounded-full bg-danger-soft text-danger">
        <TriangleAlert class="size-5" aria-hidden="true" />
      </span>
      <p class="font-medium">No se pudo cargar el resumen</p>
      <p class="text-xs text-muted">{{ errorMessage(error) }}</p>
      <UiButton variant="primary" :loading="isFetching" @click="refetch()">Reintentar</UiButton>
    </div>

    <div v-else-if="isPending || !summary || !stats || state.screen === 'loading'" class="flex flex-col gap-4" aria-busy="true">
      <span class="sr-only">Cargando el resumen del mes</span>
      <div class="grid grid-cols-1 gap-4 min-[500px]:grid-cols-2 md:grid-cols-6 lg:grid-cols-12 2xl:grid-cols-6">
        <div v-for="n in 6" :key="n" :class="['h-[84px] animate-pulse rounded-card bg-fill', n <= 2 ? STAT_SPANS.lead : STAT_SPANS.third]" />
      </div>
      <div class="grid grid-cols-12 gap-4">
        <div class="col-span-12 h-80 animate-pulse rounded-card bg-fill xl:col-span-8" />
        <div class="col-span-12 h-80 animate-pulse rounded-card bg-fill xl:col-span-4" />
      </div>
    </div>

    <!-- While the next month loads, the previous one stays on screen dimmed and marked busy. -->
    <div v-else-if="state.screen === 'welcome'":class="['grid grid-cols-12 gap-4', isPlaceholderData && 'opacity-60']" :aria-busy="isPlaceholderData">
      <WelcomeCard :class="hasAccounts ? 'col-span-12 xl:col-span-8' : 'col-span-12'" :month="summary.month" :month-name="monthNameLower(summary.month)" />
      <AccountsCard v-if="hasAccounts" class="col-span-12 xl:col-span-4" :accounts="summary.accounts" :total-balance="summary.totalBalance" />
      <RecentCard v-if="summary.recent.length" class="col-span-12" :transactions="summary.recent" :categories="categories ?? []" />
    </div>

    <div v-else :class="['flex min-w-0 flex-col gap-4', isPlaceholderData && 'opacity-60']" :aria-busy="isPlaceholderData">
      <div v-if="state.fixedFailed"class="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-card bg-danger-soft p-4" role="alert">
        <div class="min-w-0">
          <p class="text-[14px] font-medium">No se pudieron cargar los gastos fijos del mes</p>
          <p class="text-xs text-muted">{{ errorMessage(fixedError) }}</p>
        </div>
        <UiButton :loading="fixedIsFetching" @click="refetchFixed()">Reintentar</UiButton>
      </div>

      <div class="grid grid-cols-1 gap-4 min-[500px]:grid-cols-2 md:grid-cols-6 lg:grid-cols-12 2xl:grid-cols-[1.25fr_1.25fr_1fr_1fr_1fr_1fr]">
        <StatCard
          :class="STAT_SPANS.lead"
          label="Disponible para gastar"
          :value="stats.available.value"
          :detail="stats.available.detail"
          :tone="stats.available.tone"
          :icon="Wallet"
          large
        />
        <StatCard
          :class="STAT_SPANS.lead"
          label="En tus cuentas"
          :value="stats.balance.value"
          :detail="stats.balance.detail"
          :tone="stats.balance.tone"
          :icon="Landmark"
          large
        />
        <StatCard :class="STAT_SPANS.third" label="Ingresos" :value="stats.income.value" :detail="stats.income.detail" tone="success" :icon="ArrowDownLeft" />
        <StatCard :class="STAT_SPANS.third" label="Gastos" :value="stats.expenses.value" :detail="stats.expenses.detail" :icon="ArrowUpRight" />
        <StatCard :class="STAT_SPANS.third" label="Fijos por pagar" :value="stats.fixed.value" :detail="stats.fixed.detail" :tone="stats.fixed.tone" :icon="CalendarClock" />
        <StatCard
          :class="STAT_SPANS.third"
          label="Ahorro del mes"
          :value="stats.savings.value"
          :detail="stats.savings.detail"
          :tone="stats.savings.tone"
          :icon="PiggyBank"
        />
      </div>

      <div class="grid grid-cols-12 gap-4">
        <PaceCard class="col-span-12 xl:col-span-8" :summary="summary" />
        <UpcomingCard class="col-span-12 xl:col-span-4" :items="summary.upcomingFixed" />

        <CategoryBarsCard class="col-span-12 xl:col-span-5" :totals="summary.expensesByCategory" />
        <RecentCard class="col-span-12 md:col-span-7 xl:col-span-4" :transactions="summary.recent" :categories="categories ?? []" />
        <AccountsCard class="col-span-12 md:col-span-5 xl:col-span-3" :accounts="summary.accounts" :total-balance="summary.totalBalance" />
      </div>
    </div>
  </div>
</template>

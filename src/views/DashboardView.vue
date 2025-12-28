<template>
  <div class="space-y-4 sm:space-y-6 lg:space-y-8 animate-fadeIn px-2 sm:px-0">
    <!-- Stats Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
      <UiStatCard
        label="Total Ingresos"
        :value="totalIncome"
        subtitle="↑ Flujo positivo"
        variant="success"
      >
        <template #icon-small>
          <CheckCircleIcon class="w-3 h-3 sm:w-4 sm:h-4" />
        </template>
        <template #icon>
          <ArrowTrendingUpIcon class="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white" />
        </template>
      </UiStatCard>

      <UiStatCard
        label="Total Gastos"
        :value="totalExpenses"
        subtitle="↓ Egresos del periodo"
        variant="danger"
      >
        <template #icon-small>
          <XCircleIcon class="w-3 h-3 sm:w-4 sm:h-4" />
        </template>
        <template #icon>
          <ArrowTrendingDownIcon class="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white" />
        </template>
      </UiStatCard>

      <BalanceCard :balance="balance" />
    </div>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
      <CategoryChart :categories="topCategories" />
      <RecentTransactionsList :transactions="recentTransactions" />
    </div>

    <!-- Quick Stats -->
    <QuickStats :monthly-stats="monthlyStats" :transaction-count="transactions.length" />
  </div>
</template>

<script setup lang="ts">
import { toRefs } from 'vue'
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/vue/24/solid'
import { useTransactions, useTransactionStats } from '@/composables'
import {
  UiStatCard,
  BalanceCard,
  CategoryChart,
  RecentTransactionsList,
  QuickStats
} from '@/components'

const { transactions, totalIncome, totalExpenses, balance } = useTransactions()
const { topCategories, recentTransactions, monthlyStats } = useTransactionStats(toRefs(useTransactions()).transactions)
</script>

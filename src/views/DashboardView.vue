<template>
  <div class="space-y-8 animate-fadeIn">
    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <UiStatCard
        label="Total Ingresos"
        :value="totalIncome"
        subtitle="↑ Flujo positivo"
        variant="success"
      >
        <template #icon-small>
          <CheckCircleIcon class="w-4 h-4" />
        </template>
        <template #icon>
          <ArrowTrendingUpIcon class="w-8 h-8 text-white" />
        </template>
      </UiStatCard>

      <UiStatCard
        label="Total Gastos"
        :value="totalExpenses"
        subtitle="↓ Egresos del periodo"
        variant="danger"
      >
        <template #icon-small>
          <XCircleIcon class="w-4 h-4" />
        </template>
        <template #icon>
          <ArrowTrendingDownIcon class="w-8 h-8 text-white" />
        </template>
      </UiStatCard>

      <BalanceCard :balance="balance" />
    </div>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
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

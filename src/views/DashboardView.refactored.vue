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
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
        </template>
        <template #icon>
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </template>
      </UiStatCard>

      <UiStatCard
        label="Total Gastos"
        :value="totalExpenses"
        subtitle="↓ Egresos del periodo"
        variant="danger"
      >
        <template #icon-small>
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
        </template>
        <template #icon>
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
          </svg>
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
import { useTransactions } from '@/composables/useTransactions'
import { useTransactionStats } from '@/composables/useTransactionStats'
import { toRefs } from 'vue'

import UiStatCard from '@/components/ui/UiStatCard.vue'
import BalanceCard from '@/components/BalanceCard.vue'
import CategoryChart from '@/components/CategoryChart.vue'
import RecentTransactionsList from '@/components/RecentTransactionsList.vue'
import QuickStats from '@/components/QuickStats.vue'

const { transactions, totalIncome, totalExpenses, balance } = useTransactions()
const { topCategories, recentTransactions, monthlyStats } = useTransactionStats(toRefs(useTransactions()).transactions)
</script>

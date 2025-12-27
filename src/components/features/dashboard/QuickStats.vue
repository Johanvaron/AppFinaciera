<template>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
    <UiCard padding="md" variant="bordered">
      <div class="text-center">
        <div class="w-12 h-12 mx-auto bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50 rounded-xl flex items-center justify-center mb-3">
          <svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p class="text-2xl font-extrabold text-gray-900 dark:text-gray-100">
          {{ transactionCount }}
        </p>
        <p class="text-xs text-gray-600 dark:text-gray-400 mt-1 font-medium">
          Total Registros
        </p>
      </div>
    </UiCard>

    <UiCard padding="md" variant="bordered">
      <div class="text-center">
        <div class="w-12 h-12 mx-auto bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/50 dark:to-green-800/50 rounded-xl flex items-center justify-center mb-3">
          <svg class="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12" />
          </svg>
        </div>
        <p class="text-2xl font-extrabold text-green-600 dark:text-green-400">
          ${{ monthlyStats.income.toLocaleString('es-CO') }}
        </p>
        <p class="text-xs text-gray-600 dark:text-gray-400 mt-1 font-medium">
          Ingresos del Mes
        </p>
      </div>
    </UiCard>

    <UiCard padding="md" variant="bordered">
      <div class="text-center">
        <div class="w-12 h-12 mx-auto bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/50 dark:to-red-800/50 rounded-xl flex items-center justify-center mb-3">
          <svg class="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
          </svg>
        </div>
        <p class="text-2xl font-extrabold text-red-600 dark:text-red-400">
          ${{ monthlyStats.expenses.toLocaleString('es-CO') }}
        </p>
        <p class="text-xs text-gray-600 dark:text-gray-400 mt-1 font-medium">
          Gastos del Mes
        </p>
      </div>
    </UiCard>

    <UiCard padding="md" variant="bordered">
      <div class="text-center">
        <div :class="balanceIconClass">
          <svg class="w-6 h-6" :class="balanceIconColor" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <p class="text-2xl font-extrabold" :class="balanceColor">
          ${{ monthlyStats.balance.toLocaleString('es-CO') }}
        </p>
        <p class="text-xs text-gray-600 dark:text-gray-400 mt-1 font-medium">
          Balance del Mes
        </p>
      </div>
    </UiCard>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import UiCard from '@/components/ui/UiCard.vue'

interface MonthlyStats {
  income: number
  expenses: number
  balance: number
  transactionCount: number
}

interface Props {
  monthlyStats: MonthlyStats
  transactionCount: number
}

const props = defineProps<Props>()

const isPositiveBalance = computed(() => props.monthlyStats.balance >= 0)

const balanceIconClass = computed(() => {
  const base = 'w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-3'
  const colors = isPositiveBalance.value
    ? 'bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/50'
    : 'bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/50 dark:to-red-800/50'
  return `${base} ${colors}`
})

const balanceIconColor = computed(() =>
  isPositiveBalance.value
    ? 'text-blue-600 dark:text-blue-400'
    : 'text-red-600 dark:text-red-400'
)

const balanceColor = computed(() =>
  isPositiveBalance.value
    ? 'text-blue-600 dark:text-blue-400'
    : 'text-red-600 dark:text-red-400'
)
</script>

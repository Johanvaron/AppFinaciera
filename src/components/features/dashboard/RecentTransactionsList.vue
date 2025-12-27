<template>
  <UiCard padding="lg" hover>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100">
          Transacciones Recientes
        </h3>
        <div class="w-10 h-10 bg-gradient-to-br from-blue-100/80 to-blue-200/80 dark:from-blue-900/50 dark:to-blue-800/50 rounded-xl flex items-center justify-center">
          <svg class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
    </template>

    <div class="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
      <TransactionItem
        v-for="transaction in transactions"
        :key="transaction.id"
        :transaction="transaction"
      />
    </div>
  </UiCard>
</template>

<script setup lang="ts">
import type { Transaction } from '@/types'
import UiCard from '@/components/ui/UiCard.vue'
import TransactionItem from '@/components/features/transactions/TransactionItem.vue'

interface Props {
  transactions: Transaction[]
}

defineProps<Props>()
</script>

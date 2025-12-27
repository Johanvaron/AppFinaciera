<template>
  <div class="space-y-6 animate-fadeIn">
    <!-- Header & Filters -->
    <TransactionFilters
      v-model:search="filters.searchQuery"
      v-model:type="filters.type"
      v-model:category="filters.category"
      v-model:sort="filters.sortOrder"
      v-model:items-per-page="itemsPerPage"
      :categories="categories"
      :total-count="filteredTransactions.length"
      :income-count="incomeCount"
      :expense-count="expenseCount"
      @reset="resetPage"
    />

    <!-- Transactions Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <TransactionItem
        v-for="transaction in paginatedTransactions"
        :key="transaction.id"
        :transaction="transaction"
      />
    </div>

    <!-- Empty State -->
    <div
      v-if="paginatedTransactions.length === 0"
      class="text-center py-16 bg-white/80 dark:bg-gray-800/80 rounded-2xl backdrop-blur-sm border border-gray-100 dark:border-gray-700"
    >
      <MagnifyingGlassIcon class="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
      <p class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        No se encontraron transacciones
      </p>
      <p class="text-gray-600 dark:text-gray-400">
        Intenta ajustar los filtros de búsqueda
      </p>
    </div>

    <!-- Pagination -->
    <TransactionPagination
      v-if="totalPages > 1"
      v-model:current-page="currentPage"
      :total-pages="totalPages"
      :visible-pages="visiblePages"
      :total-items="filteredTransactions.length"
      :items-per-page="itemsPerPage"
    />
  </div>
</template>

<script setup lang="ts">
import { toRefs } from 'vue'
import { MagnifyingGlassIcon } from '@heroicons/vue/24/outline'
import { useTransactions, useTransactionFilters } from '@/composables'
import { TransactionItem } from '@/components'
import TransactionFilters from '@/components/features/transactions/TransactionFilters.vue'
import TransactionPagination from '@/components/features/transactions/TransactionPagination.vue'

const { transactions, categories } = useTransactions()

const {
  filters,
  currentPage,
  itemsPerPage,
  filteredTransactions,
  paginatedTransactions,
  totalPages,
  visiblePages,
  incomeCount,
  expenseCount,
  resetPage
} = useTransactionFilters(toRefs({ transactions }).transactions)
</script>

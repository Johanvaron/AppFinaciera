<template>
  <div class="space-y-4 sm:space-y-6 animate-fadeIn px-2 sm:px-0">
    <!-- Header y Filtros -->
    <div class="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 lg:p-7 border border-gray-100 dark:border-gray-700 transition-all duration-300">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div>
          <h2 class="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Transacciones
          </h2>
          <div class="flex items-center gap-3 sm:gap-5 text-xs sm:text-sm flex-wrap">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full bg-blue-500"></div>
              <span class="text-gray-600 dark:text-gray-400">Total: <span class="font-bold text-blue-600 dark:text-blue-400">{{ filteredTransactions.length }}</span></span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full bg-green-500"></div>
              <span class="text-gray-600 dark:text-gray-400">Ingresos: <span class="font-bold text-green-600 dark:text-green-400">{{ incomeCount }}</span></span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full bg-red-500"></div>
              <span class="text-gray-600 dark:text-gray-400">Gastos: <span class="font-bold text-red-600 dark:text-red-400">{{ expenseCount }}</span></span>
            </div>
          </div>
        </div>

        <!-- Search -->
        <div class="relative w-full sm:w-72 group">
          <input
            v-model="filters.searchQuery"
            type="text"
            placeholder="Buscar..."
            class="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2 sm:py-3 border-2 border-gray-200 dark:border-gray-600 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 text-sm sm:text-base text-gray-900 dark:text-gray-100"
          />
          <MagnifyingGlassIcon class="absolute left-2.5 sm:left-3.5 top-2.5 sm:top-3.5 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 transition-colors" />
        </div>
      </div>

      <!-- Filters -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
        <div class="relative group">
          <select
            v-model="filters.type"
            class="w-full appearance-none px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 lg:py-3 pr-8 sm:pr-10 border-2 border-gray-200 dark:border-gray-600 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 font-medium text-xs sm:text-sm text-gray-900 dark:text-gray-100"
          >
            <option value="all">Todos los tipos</option>
            <option value="income">💰 Ingresos</option>
            <option value="expense">💸 Gastos</option>
          </select>
          <svg class="absolute right-3 top-3.5 w-5 h-5 text-gray-400 dark:text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        <div class="relative group">
          <select
            v-model="filters.category"
            class="w-full appearance-none px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 lg:py-3 pr-8 sm:pr-10 border-2 border-gray-200 dark:border-gray-600 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 font-medium text-xs sm:text-sm text-gray-900 dark:text-gray-100"
          >
            <option value="">Todas las categorías</option>
            <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
          <svg class="absolute right-2 sm:right-3 top-2.5 sm:top-3 lg:top-3.5 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        <div class="relative group">
          <select
            v-model="filters.sortOrder"
            class="w-full appearance-none px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 lg:py-3 pr-8 sm:pr-10 border-2 border-gray-200 dark:border-gray-600 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 font-medium text-xs sm:text-sm text-gray-900 dark:text-gray-100"
          >
            <option value="date-desc">📅 Más recientes</option>
            <option value="date-asc">📅 Más antiguas</option>
            <option value="amount-desc">💵 Mayor monto</option>
            <option value="amount-asc">💵 Menor monto</option>
          </select>
          <svg class="absolute right-2 sm:right-3 top-2.5 sm:top-3 lg:top-3.5 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        <div class="relative group">
          <select
            v-model="itemsPerPage"
            class="w-full appearance-none px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 lg:py-3 pr-8 sm:pr-10 border-2 border-gray-200 dark:border-gray-600 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-300 bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 font-medium text-xs sm:text-sm text-gray-900 dark:text-gray-100"
          >
            <option :value="10">10 por página</option>
            <option :value="25">25 por página</option>
            <option :value="50">50 por página</option>
            <option :value="100">100 por página</option>
          </select>
          <svg class="absolute right-2 sm:right-3 top-2.5 sm:top-3 lg:top-3.5 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>

    <!-- Transactions Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
      <div
        v-for="transaction in paginatedTransactions"
        :key="transaction.id"
        class="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden transition-all duration-300 hover:-translate-y-1"
      >
        <TransactionItem :transaction="transaction" />
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="paginatedTransactions.length === 0"
      class="text-center py-12 sm:py-16 bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-gray-700"
    >
      <MagnifyingGlassIcon class="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 dark:text-gray-600 mx-auto mb-3 sm:mb-4" />
      <p class="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 px-4">
        No se encontraron transacciones
      </p>
      <p class="text-sm sm:text-base text-gray-600 dark:text-gray-400 px-4">
        Intenta ajustar los filtros de búsqueda
      </p>
    </div>

    <!-- Pagination -->
    <div
      v-if="totalPages > 1"
      class="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-100 dark:border-gray-700"
    >
      <div class="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
        Mostrando <span class="font-bold text-gray-900 dark:text-gray-100">{{ (currentPage - 1) * itemsPerPage + 1 }}</span> - 
        <span class="font-bold text-gray-900 dark:text-gray-100">{{ Math.min(currentPage * itemsPerPage, filteredTransactions.length) }}</span> 
        de <span class="font-bold text-gray-900 dark:text-gray-100">{{ filteredTransactions.length }}</span>
      </div>

      <div class="flex items-center gap-2">
        <button
          @click="currentPage--"
          :disabled="currentPage === 1"
          class="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100"
        >
          Anterior
        </button>

        <div class="hidden md:flex gap-1">
          <button
            v-for="page in visiblePages"
            :key="page"
            @click="currentPage = page"
            :class="[
              'px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-all duration-300',
              currentPage === page
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50'
                : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100'
            ]"
          >
            {{ page }}
          </button>
        </div>

        <div class="md:hidden text-xs font-medium text-gray-900 dark:text-gray-100 px-3">
          {{ currentPage }} / {{ totalPages }}
        </div>

        <button
          @click="currentPage++"
          :disabled="currentPage === totalPages"
          class="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100"
        >
          Siguiente
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRefs } from 'vue'
import { MagnifyingGlassIcon } from '@heroicons/vue/24/outline'
import { useTransactions, useTransactionFilters } from '@/composables'
import { TransactionItem } from '@/components'

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
  expenseCount
} = useTransactionFilters(toRefs({ transactions }).transactions)
</script>

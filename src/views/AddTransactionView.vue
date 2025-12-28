<template>
  <div class="min-h-screen lg:h-screen lg:overflow-hidden">
    <div class="h-full max-w-7xl mx-auto px-2 sm:px-3 lg:px-6 py-1 flex flex-col">
      <!-- Header compacto -->
      <div class="mb-3 sm:mb-4 text-center flex-shrink-0 hidden sm:block">
        <div class="inline-flex items-center gap-3 mb-1">
          <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Nueva Transacción
          </h1>
        </div>
      </div>

      <!-- Balance Cards compactas - Ocultas en móvil -->
      <div class="hidden sm:grid grid-cols-3 gap-3 mb-3 flex-shrink-0">
        <div class="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 sm:p-5 border border-green-100 dark:border-green-800 shadow-md">
          <div class="flex items-center gap-2 mb-1">
            <div class="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center shadow-md">
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p class="text-xs sm:text-sm font-semibold text-green-700 dark:text-green-400">Total Ingresos</p>
          </div>
          <p class="text-lg sm:text-xl md:text-2xl font-bold text-green-600 dark:text-green-400">${{ totalIncome.toLocaleString('es-CO') }}</p>
          <p class="text-[10px] sm:text-xs text-green-600 dark:text-green-500 mt-1">Flujo positivo</p>
        </div>

        <div class="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-lg p-4 sm:p-5 border border-red-100 dark:border-red-800 shadow-md">
          <div class="flex items-center gap-2 mb-1">
            <div class="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center shadow-md">
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
              </svg>
            </div>
            <p class="text-xs sm:text-sm font-semibold text-red-700 dark:text-red-400">Total Gastos</p>
          </div>
          <p class="text-lg sm:text-xl md:text-2xl font-bold text-red-600 dark:text-red-400">${{ totalExpenses.toLocaleString('es-CO') }}</p>
          <p class="text-[10px] sm:text-xs text-red-600 dark:text-red-500 mt-1">Egresos del periodo</p>
        </div>

        <div :class="[
          'rounded-lg p-4 sm:p-5 border shadow-md',
          balance >= 0 
            ? 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-100 dark:border-blue-800' 
            : 'bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-100 dark:border-orange-800'
        ]">
          <div class="flex items-center gap-2 mb-1">
            <div :class="[
              'w-8 h-8 rounded-lg flex items-center justify-center shadow-md',
              balance >= 0 ? 'bg-blue-500' : 'bg-orange-500'
            ]">
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
            <p :class="[
              'text-xs sm:text-sm font-semibold',
              balance >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-orange-700 dark:text-orange-400'
            ]">
              Balance
            </p>
          </div>
          <p :class="[
            'text-lg sm:text-xl md:text-2xl font-bold',
            balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'
          ]">
            ${{ balance.toLocaleString('es-CO') }}
          </p>
          <p :class="[
            'text-[10px] sm:text-xs mt-1',
            balance >= 0 ? 'text-blue-600 dark:text-blue-500' : 'text-orange-600 dark:text-orange-500'
          ]">
            {{ balance >= 0 ? 'Positivo' : 'Negativo' }}
          </p>
        </div>
      </div>

      <!-- Form compacto -->
      <div class="flex-1 min-h-0">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 p-5 sm:p-6 max-h-[calc(100vh-80px)] overflow-y-auto">
          <TransactionForm @success="handleSuccess" />
        </div>
      </div>
    </div>

    <!-- Success Notification -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="translate-y-full opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-full opacity-0"
    >
      <div
        v-if="showNotification"
        class="fixed bottom-6 right-6 bg-green-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <span class="font-semibold">¡Transacción agregada con éxito!</span>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTransactionsStore } from '@/stores/transactions'
import UiStatCard from '@/components/ui/UiStatCard.vue'
import UiCard from '@/components/ui/UiCard.vue'
import TransactionForm from '@/components/features/transactions/TransactionForm.vue'

const transactionsStore = useTransactionsStore()

const totalIncome = computed(() => transactionsStore.totalIncome)
const totalExpenses = computed(() => transactionsStore.totalExpenses)
const balance = computed(() => transactionsStore.balance)

const showNotification = ref(false)

const handleSuccess = () => {
  showNotification.value = true
  setTimeout(() => {
    showNotification.value = false
  }, 3000)
}
</script>

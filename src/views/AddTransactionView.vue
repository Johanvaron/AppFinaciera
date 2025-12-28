<template>
  <div class="min-h-screen">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header con gradiente -->
      <div class="mb-8 text-center">
        <div class="inline-flex items-center gap-3 mb-4">
          <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
            <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Nueva Transacción
          </h1>
        </div>
        <p class="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Registra tus ingresos y gastos de forma rápida y sencilla. Mantén el control de tus finanzas personales.
        </p>
      </div>

      <!-- Balance Cards - Horizontal arriba -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-6 border border-green-100 dark:border-green-800 shadow-sm">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p class="text-sm font-semibold text-green-700 dark:text-green-400">Total Ingresos</p>
          </div>
          <p class="text-3xl font-bold text-green-600 dark:text-green-400">${{ totalIncome.toLocaleString('es-CO') }}</p>
          <p class="text-xs text-green-600 dark:text-green-500 mt-1">Flujo positivo</p>
        </div>

        <div class="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-2xl p-6 border border-red-100 dark:border-red-800 shadow-sm">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
              </svg>
            </div>
            <p class="text-sm font-semibold text-red-700 dark:text-red-400">Total Gastos</p>
          </div>
          <p class="text-3xl font-bold text-red-600 dark:text-red-400">${{ totalExpenses.toLocaleString('es-CO') }}</p>
          <p class="text-xs text-red-600 dark:text-red-500 mt-1">Egresos del periodo</p>
        </div>

        <div :class="[
          'rounded-2xl p-6 border shadow-sm',
          balance >= 0 
            ? 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-100 dark:border-blue-800' 
            : 'bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-100 dark:border-orange-800'
        ]">
          <div class="flex items-center gap-3 mb-2">
            <div :class="[
              'w-10 h-10 rounded-xl flex items-center justify-center',
              balance >= 0 ? 'bg-blue-500' : 'bg-orange-500'
            ]">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
            <p :class="[
              'text-sm font-semibold',
              balance >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-orange-700 dark:text-orange-400'
            ]">
              Balance
            </p>
          </div>
          <p :class="[
            'text-3xl font-bold',
            balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'
          ]">
            ${{ balance.toLocaleString('es-CO') }}
          </p>
          <p :class="[
            'text-xs mt-1',
            balance >= 0 ? 'text-blue-600 dark:text-blue-500' : 'text-orange-600 dark:text-orange-500'
          ]">
            {{ balance >= 0 ? 'Positivo' : 'Negativo' }}
          </p>
        </div>
      </div>

      <!-- Form - Abajo con el mismo ancho que las tarjetas -->
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8">
        <TransactionForm @success="handleSuccess" />
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

<template>
  <div class="max-w-4xl mx-auto space-y-8 animate-fadeIn">
    <!-- Header -->
    <div class="text-center">
      <h1 class="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-gray-100 mb-3">
        Nueva Transacción
      </h1>
      <p class="text-gray-600 dark:text-gray-400 text-lg">
        Registra tus ingresos y gastos de forma rápida y sencilla
      </p>
    </div>

    <!-- Balance Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      <UiStatCard 
        label="Total Ingresos"
        :value="totalIncome"
        variant="success"
        subtitle="Flujo positivo"
      />
      <UiStatCard 
        label="Total Gastos"
        :value="totalExpenses"
        variant="danger"
        subtitle="Egresos del periodo"
      />
      <UiStatCard 
        label="Balance"
        :value="balance"
        :variant="balance >= 0 ? 'success' : 'danger'"
        :subtitle="balance >= 0 ? 'Positivo' : 'Negativo'"
      />
    </div>

    <!-- Form -->
    <UiCard padding="lg" hover>
      <TransactionForm @success="handleSuccess" />
    </UiCard>

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

<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <!-- Tipo de Transacción -->
    <div>
      <label class="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
        <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
        Tipo de Transacción *
      </label>
      <div class="grid grid-cols-2 gap-3">
        <button
          type="button"
          @click="form.type = 'income'"
          :class="[
            'flex items-center gap-2 p-3 rounded-lg border-2 transition-all duration-200',
            form.type === 'income'
              ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow-md'
              : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700'
          ]"
        >
          <div :class="[
            'w-10 h-10 rounded-lg flex items-center justify-center',
            form.type === 'income' 
              ? 'bg-green-500' 
              : 'bg-gray-200 dark:bg-gray-700'
          ]">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <span :class="[
            'font-semibold text-sm sm:text-base',
            form.type === 'income' ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
          ]">
            Ingreso
          </span>
          <svg v-if="form.type === 'income'" class="w-5 h-5 ml-auto text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
        </button>

        <button
          type="button"
          @click="form.type = 'expense'"
          :class="[
            'flex items-center gap-2 p-3 rounded-lg border-2 transition-all duration-200',
            form.type === 'expense'
              ? 'border-red-500 bg-red-50 dark:bg-red-900/20 shadow-md'
              : 'border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-700'
          ]"
        >
          <div :class="[
            'w-10 h-10 rounded-lg flex items-center justify-center',
            form.type === 'expense' 
              ? 'bg-red-500' 
              : 'bg-gray-200 dark:bg-gray-700'
          ]">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
            </svg>
          </div>
          <span :class="[
            'font-semibold text-sm sm:text-base',
            form.type === 'expense' ? 'text-red-700 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
          ]">
            Gasto
          </span>
          <svg v-if="form.type === 'expense'" class="w-5 h-5 ml-auto text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Descripción -->
    <div>
      <label class="flex items-center gap-2 text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
        <svg class="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Descripción *
      </label>
      <UiInput
        v-model="form.description"
        placeholder="Ej: Salario mensual, Compra supermercado..."
        required
      />
    </div>

    <!-- Monto y Categoría en Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="flex items-center gap-2 text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
          <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Monto *
        </label>
        <UiInput
          v-model="form.amount"
          type="number"
          placeholder="0.00"
          prefix="$"
          required
          :min="0"
          step="0.01"
        />
      </div>

      <div>
        <label class="flex items-center gap-2 text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
          <svg class="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          Categoría *
        </label>
        <UiSelect
          v-model="form.category"
          required
        >
          <option value="" disabled>Selecciona una categoría</option>
          <option v-for="category in categoryOptions" :key="category" :value="category">
            {{ category }}
          </option>
        </UiSelect>
      </div>
    </div>

    <!-- Fecha -->
    <div>
      <label class="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
        <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Fecha *
      </label>
      <UiInput
        v-model="form.date"
        type="date"
        required
        :max="todayString"
      />
    </div>

    <!-- Buttons -->
    <div class="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
      <UiButton
        type="submit"
        variant="primary"
        size="sm"
        fullWidth
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        Guardar Transacción
      </UiButton>

      <UiButton
        type="button"
        variant="ghost"
        size="sm"
        @click="resetForm"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Limpiar
      </UiButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTransactionsStore } from '@/stores/transactions'
import type { TransactionType } from '@/types'
import UiInput from '@/components/ui/UiInput.vue'
import UiSelect from '@/components/ui/UiSelect.vue'
import UiButton from '@/components/ui/UiButton.vue'

const emit = defineEmits<{
  success: []
}>()

const transactionsStore = useTransactionsStore()

const form = ref<{
  type: TransactionType
  description: string
  amount: number | null
  category: string
  date: string
}>({
  type: 'income',
  description: '',
  amount: null,
  category: '',
  date: new Date().toISOString().split('T')[0] || ''
})

const todayString = computed(() => {
  return new Date().toISOString().split('T')[0]
})

const categoryOptions = computed(() => {
  const incomeCategories = ['Salario', 'Freelance', 'Inversiones', 'Ventas', 'Otros Ingresos']
  const expenseCategories = ['Alimentación', 'Transporte', 'Vivienda', 'Entretenimiento', 'Salud', 'Educación', 'Servicios', 'Otros Gastos']
  
  return form.value.type === 'income' ? incomeCategories : expenseCategories
})

const handleSubmit = () => {
  if (!form.value.amount || form.value.amount <= 0) {
    alert('Por favor ingresa un monto válido')
    return
  }

  transactionsStore.addTransaction({
    type: form.value.type as 'income' | 'expense',
    description: form.value.description,
    amount: form.value.amount,
    category: form.value.category,
    date: form.value.date
  })

  emit('success')
  resetForm()
}

const resetForm = () => {
  form.value = {
    type: 'income',
    description: '',
    amount: null,
    category: '',
    date: new Date().toISOString().split('T')[0] || ''
  }
}
</script>

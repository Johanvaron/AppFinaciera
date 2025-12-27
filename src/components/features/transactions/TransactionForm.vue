<template>
  <form @submit.prevent="handleSubmit" class="space-y-7">
    <!-- Tipo de Transacción -->
    <div>
      <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">
        Tipo de Transacción *
      </label>
      <div class="grid grid-cols-2 gap-5">
        <button
          type="button"
          @click="form.type = 'income'"
          :class="[
            'relative p-6 rounded-2xl border-3 transition-all duration-300 group overflow-hidden',
            form.type === 'income'
              ? 'border-green-500 bg-green-50 dark:bg-green-900/30 shadow-lg shadow-green-500/30 scale-105'
              : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700 hover:shadow-md'
          ]"
        >
          <div class="flex flex-col items-center gap-3 relative z-10">
            <div :class="[
              'w-16 h-16 rounded-2xl flex items-center justify-center transform transition-transform duration-300 group-hover:scale-110',
              form.type === 'income' 
                ? 'bg-gradient-to-br from-green-500 to-green-600 shadow-lg' 
                : 'bg-gray-100 dark:bg-gray-700'
            ]">
              <svg class="w-8 h-8" :class="form.type === 'income' ? 'text-white' : 'text-gray-400 dark:text-gray-500'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span :class="[
              'font-bold text-lg',
              form.type === 'income' ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
            ]">
              Ingreso
            </span>
          </div>
          
          <!-- Checkmark Badge -->
          <Transition
            enter-active-class="transition duration-200"
            enter-from-class="scale-0 opacity-0"
            enter-to-class="scale-100 opacity-100"
            leave-active-class="transition duration-150"
            leave-from-class="scale-100 opacity-100"
            leave-to-class="scale-0 opacity-0"
          >
            <div v-if="form.type === 'income'" class="absolute top-3 right-3">
              <div class="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </Transition>
        </button>

        <button
          type="button"
          @click="form.type = 'expense'"
          :class="[
            'relative p-6 rounded-2xl border-3 transition-all duration-300 group overflow-hidden',
            form.type === 'expense'
              ? 'border-red-500 bg-red-50 dark:bg-red-900/30 shadow-lg shadow-red-500/30 scale-105'
              : 'border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-700 hover:shadow-md'
          ]"
        >
          <div class="flex flex-col items-center gap-3 relative z-10">
            <div :class="[
              'w-16 h-16 rounded-2xl flex items-center justify-center transform transition-transform duration-300 group-hover:scale-110',
              form.type === 'expense' 
                ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-lg' 
                : 'bg-gray-100 dark:bg-gray-700'
            ]">
              <svg class="w-8 h-8" :class="form.type === 'expense' ? 'text-white' : 'text-gray-400 dark:text-gray-500'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
              </svg>
            </div>
            <span :class="[
              'font-bold text-lg',
              form.type === 'expense' ? 'text-red-700 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
            ]">
              Gasto
            </span>
          </div>
          
          <!-- Checkmark Badge -->
          <Transition
            enter-active-class="transition duration-200"
            enter-from-class="scale-0 opacity-0"
            enter-to-class="scale-100 opacity-100"
            leave-active-class="transition duration-150"
            leave-from-class="scale-100 opacity-100"
            leave-to-class="scale-0 opacity-0"
          >
            <div v-if="form.type === 'expense'" class="absolute top-3 right-3">
              <div class="w-7 h-7 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </Transition>
        </button>
      </div>
    </div>

    <!-- Descripción -->
    <UiInput
      v-model="form.description"
      label="Descripción"
      placeholder="Ej: Salario mensual, Compra supermercado..."
      required
    />

    <!-- Monto y Categoría en Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <UiInput
        v-model="form.amount"
        type="number"
        label="Monto"
        placeholder="0.00"
        prefix="$"
        required
        :min="0"
        step="0.01"
      />

      <UiSelect
        v-model="form.category"
        label="Categoría"
        :options="categoryOptions"
        required
      />
    </div>

    <!-- Fecha -->
    <UiInput
      v-model="form.date"
      type="date"
      label="Fecha"
      required
      :max="todayString"
    />

    <!-- Buttons -->
    <div class="flex items-center gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
      <UiButton
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Guardar Transacción
      </UiButton>

      <UiButton
        type="button"
        variant="ghost"
        size="lg"
        @click="resetForm"
      >
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

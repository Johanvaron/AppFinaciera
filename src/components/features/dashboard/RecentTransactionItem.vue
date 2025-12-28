<template>
  <div class="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg transition-all duration-200 group">
    <div :class="iconContainerClass">
      <svg v-if="transaction.type === 'income'" class="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
      <svg v-else class="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
      </svg>
    </div>
    
    <div class="flex-1 min-w-0">
      <p class="font-bold text-xs sm:text-sm text-gray-900 dark:text-gray-100 truncate">
        {{ transaction.description }}
      </p>
      <div class="flex items-center gap-1.5 flex-wrap mt-0.5">
        <span :class="categoryBadgeClass">
          {{ transaction.category }}
        </span>
        <span class="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
          {{ formattedDate }}
        </span>
      </div>
    </div>
    
    <div class="text-right flex-shrink-0">
      <p :class="amountClass">
        {{ formattedAmount }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Transaction } from '@/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Props {
  transaction: Transaction
}

const props = defineProps<Props>()

const formattedDate = computed(() => {
  try {
    return format(new Date(props.transaction.date), 'd MMM', { locale: es })
  } catch (error) {
    return props.transaction.date
  }
})

const formattedAmount = computed(() => {
  const sign = props.transaction.type === 'income' ? '+' : '-'
  return `${sign}$${props.transaction.amount.toLocaleString('es-CO')}`
})

const iconContainerClass = computed(() => {
  const base = 'w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shadow-md transform group-hover:scale-105 transition-all duration-200 flex-shrink-0'
  const gradient = props.transaction.type === 'income'
    ? 'bg-gradient-to-br from-green-500 to-green-600'
    : 'bg-gradient-to-br from-red-500 to-red-600'
  return `${base} ${gradient}`
})

const categoryBadgeClass = computed(() => {
  const base = 'px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded text-[8px] sm:text-[9px] font-bold uppercase tracking-wide'
  const colors = props.transaction.type === 'income'
    ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
    : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
  return `${base} ${colors}`
})

const amountClass = computed(() => {
  const base = 'text-xs sm:text-sm md:text-base font-extrabold tabular-nums'
  const color = props.transaction.type === 'income'
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-600 dark:text-red-400'
  return `${base} ${color}`
})
</script>

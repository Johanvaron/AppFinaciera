<template>
  <div class="flex items-center gap-4 p-4 rounded-xl hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-gray-700 dark:hover:to-gray-600 transition-all duration-300 border border-transparent hover:border-blue-100 dark:hover:border-blue-800 cursor-pointer group">
    <div :class="iconContainerClass">
      <svg v-if="transaction.type === 'income'" class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
      <svg v-else class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
      </svg>
    </div>
    
    <div class="flex-1 min-w-0">
      <p class="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
        {{ transaction.description }}
      </p>
      <div class="flex items-center gap-2 mt-1">
        <span :class="categoryBadgeClass">
          {{ transaction.category }}
        </span>
        <span class="text-xs text-gray-500 dark:text-gray-400">
          {{ formattedDate }}
        </span>
      </div>
    </div>
    
    <div class="text-right">
      <p :class="amountClass">
        {{ formattedAmount }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Transaction } from '@/types'
import { useDateFormatter } from '@/composables/useDateFormatter'

interface Props {
  transaction: Transaction
}

const props = defineProps<Props>()
const { formatDate } = useDateFormatter()

const formattedDate = computed(() => formatDate(props.transaction.date))

const formattedAmount = computed(() => {
  const sign = props.transaction.type === 'income' ? '+' : '-'
  return `${sign}$${props.transaction.amount.toLocaleString('es-CO')}`
})

const iconContainerClass = computed(() => {
  const base = 'w-12 h-12 rounded-xl flex items-center justify-center shadow-sm transform group-hover:scale-110 transition-transform duration-300'
  const gradient = props.transaction.type === 'income'
    ? 'bg-gradient-to-br from-green-500/90 to-green-700/90'
    : 'bg-gradient-to-br from-red-500/90 to-red-700/90'
  return `${base} ${gradient}`
})

const categoryBadgeClass = computed(() => {
  const base = 'px-2 py-1 rounded-lg text-xs font-bold'
  const colors = props.transaction.type === 'income'
    ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
    : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
  return `${base} ${colors}`
})

const amountClass = computed(() => {
  const base = 'text-base font-extrabold'
  const color = props.transaction.type === 'income'
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-600 dark:text-red-400'
  return `${base} ${color}`
})
</script>

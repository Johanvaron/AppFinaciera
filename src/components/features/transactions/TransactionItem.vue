<template>
  <div class="flex items-center gap-5 p-6 hover:bg-gradient-to-r hover:from-gray-50/50 hover:to-transparent dark:hover:from-gray-700/30 dark:hover:to-transparent transition-all duration-300 group">
    <div :class="iconContainerClass">
      <svg v-if="transaction.type === 'income'" class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
      <svg v-else class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
      </svg>
    </div>
    
    <div class="flex-1 min-w-0">
      <p class="font-bold text-lg text-gray-900 dark:text-gray-100 mb-1.5 truncate">
        {{ transaction.description }}
      </p>
      <div class="flex items-center gap-3">
        <span :class="categoryBadgeClass">
          {{ transaction.category }}
        </span>
        <span class="text-sm text-gray-500 dark:text-gray-400 font-medium">
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
  const base = 'w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300'
  const gradient = props.transaction.type === 'income'
    ? 'bg-gradient-to-br from-green-500 to-green-700'
    : 'bg-gradient-to-br from-red-500 to-red-700'
  return `${base} ${gradient}`
})

const categoryBadgeClass = computed(() => {
  const base = 'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide'
  const colors = props.transaction.type === 'income'
    ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
    : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
  return `${base} ${colors}`
})

const amountClass = computed(() => {
  const base = 'text-xl font-extrabold tabular-nums'
  const color = props.transaction.type === 'income'
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-600 dark:text-red-400'
  return `${base} ${color}`
})
</script>

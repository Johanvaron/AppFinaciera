<template>
  <div class="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl p-7 border hover-lift overflow-hidden transition-all duration-300"
    :class="borderClass"
  >
    <div class="relative flex items-center justify-between">
      <div>
        <p class="text-sm font-semibold mb-2 flex items-center gap-1" :class="labelClass">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clip-rule="evenodd" />
          </svg>
          Balance Total
        </p>
        <p class="text-4xl font-extrabold" :class="valueClass">
          ${{ balance.toLocaleString('es-CO') }}
        </p>
        <p class="text-xs mt-2 font-medium" :class="subtitleClass">
          {{ balanceStatus }}
        </p>
      </div>
      <div :class="iconContainerClass">
        <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  balance: number
}

const props = defineProps<Props>()

const isPositive = computed(() => props.balance >= 0)

const balanceStatus = computed(() => 
  isPositive.value ? '✓ Balance positivo' : '⚠ Balance negativo'
)

const borderClass = computed(() => 
  isPositive.value 
    ? 'border-blue-100 dark:border-blue-900' 
    : 'border-red-100 dark:border-red-900'
)

const labelClass = computed(() => 
  isPositive.value 
    ? 'text-blue-700 dark:text-blue-400' 
    : 'text-red-700 dark:text-red-400'
)

const valueClass = computed(() => 
  isPositive.value 
    ? 'text-blue-600 dark:text-blue-400' 
    : 'text-red-600 dark:text-red-400'
)

const subtitleClass = computed(() => 
  isPositive.value 
    ? 'text-blue-600 dark:text-blue-400' 
    : 'text-red-600 dark:text-red-400'
)

const iconContainerClass = computed(() => {
  const base = 'w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:rotate-6 transition-transform duration-300'
  const gradient = isPositive.value 
    ? 'bg-gradient-to-br from-blue-500/90 to-blue-700/90' 
    : 'bg-gradient-to-br from-red-500/90 to-red-700/90'
  return `${base} ${gradient}`
})
</script>

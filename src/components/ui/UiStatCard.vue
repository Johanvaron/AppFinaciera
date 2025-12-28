<template>
  <div :class="statCardClasses">
    <div class="relative flex items-center justify-between gap-2">
      <div class="flex-1 min-w-0">
        <p class="text-[10px] sm:text-xs md:text-sm font-semibold mb-1 sm:mb-2 flex items-center gap-1" :class="labelColorClass">
          <slot name="icon-small" />
          {{ label }}
        </p>
        <p class="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold break-words" :class="valueColorClass">
          {{ formattedValue }}
        </p>
        <p v-if="subtitle" class="text-[9px] sm:text-[10px] md:text-xs mt-1 sm:mt-2 font-medium" :class="subtitleColorClass">
          {{ subtitle }}
        </p>
      </div>
      
      <div :class="iconContainerClass" class="flex-shrink-0">
        <slot name="icon" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  label: string
  value: number
  subtitle?: string
  variant: 'success' | 'danger' | 'info'
}

const props = defineProps<Props>()

const formattedValue = computed(() => {
  return `$${props.value.toLocaleString('es-CO')}`
})

const statCardClasses = computed(() => {
  const base = 'group relative bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-2xl p-3 sm:p-5 md:p-6 lg:p-7 hover-lift overflow-hidden transition-all duration-300'
  
  const borderColors = {
    success: 'border border-green-100 dark:border-green-900',
    danger: 'border border-red-100 dark:border-red-900',
    info: 'border border-blue-100 dark:border-blue-900'
  }
  
  return [base, borderColors[props.variant]].join(' ')
})

const labelColorClass = computed(() => {
  const colors = {
    success: 'text-green-700 dark:text-green-400',
    danger: 'text-red-700 dark:text-red-400',
    info: 'text-blue-700 dark:text-blue-400'
  }
  return colors[props.variant]
})

const valueColorClass = computed(() => {
  const colors = {
    success: 'text-green-600 dark:text-green-400',
    danger: 'text-red-600 dark:text-red-400',
    info: 'text-blue-600 dark:text-blue-400'
  }
  return colors[props.variant]
})

const subtitleColorClass = computed(() => {
  const colors = {
    success: 'text-green-600 dark:text-green-400',
    danger: 'text-red-600 dark:text-red-400',
    info: 'text-blue-600 dark:text-blue-400'
  }
  return colors[props.variant]
})

const iconContainerClass = computed(() => {
  const base = 'w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg transform group-hover:rotate-6 transition-transform duration-300'
  
  const gradients = {
    success: 'bg-gradient-to-br from-green-500/90 to-green-700/90',
    danger: 'bg-gradient-to-br from-red-500/90 to-red-700/90',
    info: 'bg-gradient-to-br from-blue-500/90 to-blue-700/90'
  }
  
  return [base, gradients[props.variant]].join(' ')
})
</script>

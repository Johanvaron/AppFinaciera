<template>
  <div class="group">
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-2">
        <span class="w-7 h-7 bg-gradient-to-br from-blue-500/90 to-blue-700/90 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-sm">
          {{ index + 1 }}
        </span>
        <span class="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {{ category.category }}
        </span>
      </div>
      <div class="text-right">
        <span class="text-sm font-bold text-gray-900 dark:text-gray-100">
          ${{ category.total.toLocaleString('es-CO') }}
        </span>
        <span class="text-xs text-gray-500 dark:text-gray-400 ml-1">
          ({{ category.percentage.toFixed(1) }}%)
        </span>
      </div>
    </div>
    <div class="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden shadow-inner">
      <div 
        class="h-3 rounded-full transition-all duration-700 ease-out shadow-sm"
        :class="gradientClass"
        :style="{ width: `${category.percentage}%` }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CategoryStat } from '@/types'

interface Props {
  category: CategoryStat
  index: number
}

const props = defineProps<Props>()

const gradientClass = computed(() => {
  const gradients = [
    'bg-gradient-to-r from-purple-500 to-purple-700',
    'bg-gradient-to-r from-blue-500 to-blue-700',
    'bg-gradient-to-r from-blue-400 to-blue-600',
    'bg-gradient-to-r from-indigo-400 to-indigo-600',
    'bg-gradient-to-r from-gray-400 to-gray-600'
  ]
  return gradients[props.index] || gradients[4]
})
</script>

<template>
  <div :class="cardClasses">
    <div v-if="$slots.header" class="mb-4">
      <slot name="header" />
    </div>
    
    <div>
      <slot />
    </div>
    
    <div v-if="$slots.footer" class="mt-4">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'default' | 'bordered' | 'elevated'
  padding?: 'sm' | 'md' | 'lg' | 'none'
  hover?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  padding: 'md',
  hover: false
})

const cardClasses = computed(() => {
  const base = 'bg-white dark:bg-gray-800 rounded-2xl transition-all duration-300'
  
  const variants = {
    default: 'shadow-lg',
    bordered: 'border-2 border-gray-200 dark:border-gray-700',
    elevated: 'shadow-xl'
  }
  
  const paddings = {
    none: '',
    sm: 'p-2 sm:p-3 md:p-4',
    md: 'p-3 sm:p-4 md:p-5 lg:p-6',
    lg: 'p-4 sm:p-5 md:p-6 lg:p-8'
  }
  
  const hoverEffect = props.hover ? 'hover:shadow-2xl hover-lift' : ''
  
  return [base, variants[props.variant], paddings[props.padding], hoverEffect]
    .filter(Boolean)
    .join(' ')
})
</script>

<template>
  <div class="relative">
    <label
      v-if="label"
      :for="id"
      class="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 uppercase tracking-wide"
    >
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    
    <div class="relative group">
      <select
        :id="id"
        :value="modelValue"
        :required="required"
        :disabled="disabled"
        :class="selectClasses"
        @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      >
        <slot />
      </select>
      
      <svg
        class="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 dark:text-gray-500 pointer-events-none"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
    
    <p v-if="error" class="mt-2 text-sm text-red-600 dark:text-red-400">
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  id?: string
  label?: string
  modelValue?: string | number
  required?: boolean
  disabled?: boolean
  error?: string
}

const props = withDefaults(defineProps<Props>(), {
  required: false,
  disabled: false
})

defineEmits<{
  'update:modelValue': [value: string]
}>()

const selectClasses = computed(() => {
  const base = 'w-full appearance-none px-4 py-3 pr-12 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all duration-200 bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 font-medium text-base text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const borderColor = props.error 
    ? 'border-red-500 dark:border-red-500' 
    : 'border-gray-200 dark:border-gray-600'
  
  return [base, borderColor].filter(Boolean).join(' ')
})
</script>

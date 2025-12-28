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
    
    <div class="relative">
      <span
        v-if="prefix"
        class="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-600 dark:text-gray-400 font-bold text-base"
      >
        {{ prefix }}
      </span>
      
      <input
        :id="id"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :min="min"
        :max="max"
        :step="step"
        :class="inputClasses"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      
      <div v-if="$slots.icon" class="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
        <slot name="icon" />
      </div>
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
  type?: 'text' | 'number' | 'email' | 'password' | 'date' | 'search'
  modelValue?: string | number
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
  prefix?: string
  min?: string | number
  max?: string | number
  step?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  required: false,
  disabled: false
})

defineEmits<{
  'update:modelValue': [value: string]
}>()

const inputClasses = computed(() => {
    const base = 'w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all duration-200 bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 font-medium text-base text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'
  const borderColor = props.error 
    ? 'border-red-500 dark:border-red-500' 
    : 'border-gray-200 dark:border-gray-600'
  
  const padding = props.prefix ? 'pl-10' : ''
  
  return [base, borderColor, padding].filter(Boolean).join(' ')
})
</script>

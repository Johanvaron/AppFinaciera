<script setup lang="ts">
withDefaults(defineProps<{ tone?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' }>(), { tone: 'neutral' })

const TONES = {
  primary: 'bg-primary-soft text-primary',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-fill text-muted',
}
</script>

<template>
  <span :class="['inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full px-2 text-xs font-medium', TONES[tone]]">
    <slot />
  </span>
</template>

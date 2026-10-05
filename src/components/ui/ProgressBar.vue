<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    /** Fraction: 0.5 = half. Values over 1 fill the bar. Null = empty. */
    ratio: number | null
    tone?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral'
    label: string
  }>(),
  { tone: 'primary' },
)

const width = computed(() => `${Math.min(Math.max(props.ratio ?? 0, 0), 1) * 100}%`)
const TONES = { primary: 'bg-primary', success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger', neutral: 'bg-muted' }
</script>

<template>
  <div
    class="h-2 w-full overflow-hidden rounded-full bg-fill"
    role="progressbar"
    :aria-label="label"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="Math.round((ratio ?? 0) * 100)"
  >
    <div :class="['h-full rounded-full transition-[width] duration-300', TONES[tone]]" :style="{ width }" />
  </div>
</template>

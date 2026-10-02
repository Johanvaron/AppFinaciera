<script setup lang="ts">
/**
 * Fixed-height box for a Chart.js canvas. The height is tied to the WINDOW
 * (clamp) and capped, never to a sibling: a chart that sizes itself against
 * its neighbour loops through ResizeObserver and grows without end.
 * Charts inside must use `maintainAspectRatio: false`.
 */
withDefaults(defineProps<{ size?: 'sm' | 'md' | 'lg' }>(), { size: 'md' })

const HEIGHTS = {
  sm: 'clamp(160px, 22vh, 220px)',
  md: 'clamp(220px, 32vh, 320px)',
  lg: 'clamp(260px, 42vh, 420px)',
}
</script>

<template>
  <div class="relative w-full min-w-0 overflow-hidden" :style="{ height: HEIGHTS[size] }">
    <div class="absolute inset-0">
      <slot />
    </div>
  </div>
</template>

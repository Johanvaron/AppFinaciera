<script setup lang="ts">
/**
 * One figure of the month. The tone colors the soft background and the icon;
 * the number itself stays in ink so it reads first.
 */
import type { Component } from 'vue'

withDefaults(
  defineProps<{
    label: string
    value: string
    icon: Component
    tone?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral'
    /** Small line under the figure, e.g. "+10 % vs septiembre". */
    detail?: string
    /** Makes this the lead figure of the row. */
    large?: boolean
  }>(),
  { tone: 'neutral' },
)

const TONES = {
  primary: { box: 'bg-primary-soft', icon: 'bg-primary text-primary-ink' },
  success: { box: 'bg-success-soft', icon: 'bg-success text-surface' },
  warning: { box: 'bg-warning-soft', icon: 'bg-warning text-surface' },
  danger: { box: 'bg-danger-soft', icon: 'bg-danger text-surface' },
  neutral: { box: 'bg-surface shadow-card', icon: 'bg-fill text-muted' },
}
</script>

<template>
  <div :class="['flex min-w-0 items-center gap-3 rounded-card p-4', TONES[tone].box]">
    <span :class="['flex size-10 shrink-0 items-center justify-center rounded-full', TONES[tone].icon]">
      <component :is="icon" class="size-5" aria-hidden="true" />
    </span>
    <div class="min-w-0 flex-1">
      <p class="truncate text-xs font-medium text-muted">{{ label }}</p>
      <p :class="['num truncate font-semibold leading-tight', large ? 'text-[26px]' : 'text-[20px]']">{{ value }}</p>
      <p v-if="detail" class="truncate text-xs text-muted">{{ detail }}</p>
      <!-- Extra content under the figure, e.g. a ProgressBar. -->
      <slot />
    </div>
  </div>
</template>

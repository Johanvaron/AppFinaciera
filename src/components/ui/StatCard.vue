<script setup lang="ts">
/**
 * One figure of the month. The tone colors the soft background and the icon;
 * the number itself stays in ink so it reads first.
 * The figure is never cut: in a narrow card (two columns on a phone) the icon
 * goes on top and the figure shrinks with the card, down to 13px at most.
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
  <div :class="['stat-card min-w-0 rounded-card p-4', TONES[tone].box]">
    <div class="stat-card-row flex min-w-0 flex-col gap-2">
      <span :class="['flex size-10 shrink-0 items-center justify-center rounded-full', TONES[tone].icon]">
        <component :is="icon" class="size-5" aria-hidden="true" />
      </span>
      <div class="min-w-0 flex-1">
        <p class="truncate text-xs font-medium text-muted">{{ label }}</p>
        <p :class="['stat-card-figure num font-semibold leading-tight', large && 'stat-card-figure-large']">{{ value }}</p>
        <p v-if="detail" class="truncate text-xs text-muted">{{ detail }}</p>
        <!-- Extra content under the figure, e.g. a ProgressBar. -->
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.stat-card {
  container-type: inline-size;
}

/*
 * A 9-digit figure ("$ 123.456.789") is about 7.5em wide, so 12% of the room
 * it has keeps it inside the card. 100cqi is the card without its padding.
 */
.stat-card-figure {
  --figure-room: 100cqi;
  --figure-max: 20px;
  font-size: clamp(13px, calc(var(--figure-room) * 0.12), var(--figure-max));
}

.stat-card-figure-large {
  --figure-max: 26px;
}

/* Wide enough for the icon (40px + 12px gap) beside a full-size figure. */
@container (min-width: 270px) {
  .stat-card-row {
    flex-direction: row;
    align-items: center;
    gap: 12px;
  }

  .stat-card-figure {
    --figure-room: calc(100cqi - 52px);
  }
}
</style>

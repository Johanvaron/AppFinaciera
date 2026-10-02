<script setup lang="ts">
/**
 * Top of every screen: icon + title on the left, month switcher and the
 * screen's own actions on the right. Filters go BELOW it, in their own row.
 */
import type { Component } from 'vue'
import MonthSwitcher from './MonthSwitcher.vue'

withDefaults(defineProps<{ title: string; subtitle?: string; icon: Component; month?: boolean }>(), { month: true })
</script>

<template>
  <header class="flex flex-wrap items-center gap-x-4 gap-y-2">
    <div class="flex min-w-0 basis-full items-center gap-3 sm:flex-1 sm:basis-0">
      <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <component :is="icon" class="size-5" aria-hidden="true" />
      </span>
      <div class="min-w-0">
        <h1 class="truncate text-[22px] font-semibold leading-tight">{{ title }}</h1>
        <p v-if="subtitle" class="truncate text-xs text-muted">{{ subtitle }}</p>
      </div>
    </div>
    <MonthSwitcher v-if="month" />
    <div v-if="$slots.default" class="flex flex-wrap items-center gap-2">
      <slot />
    </div>
  </header>
</template>

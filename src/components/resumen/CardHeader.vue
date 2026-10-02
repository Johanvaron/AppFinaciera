<script setup lang="ts">
/** Title row of a dashboard card, with an optional link to the full screen. */
import { RouterLink } from 'vue-router'
import { ChevronRight } from 'lucide-vue-next'

defineProps<{ title: string; to?: string; linkLabel?: string }>()
</script>

<template>
  <div class="flex min-w-0 items-center justify-between gap-3">
    <h2 class="min-w-0 truncate text-[15px] font-semibold">{{ title }}</h2>
    <RouterLink v-if="to && linkLabel" :to="to" class="inline-flex shrink-0 items-center gap-0.5 rounded-lg text-xs font-medium text-primary hover:underline">
      {{ linkLabel }}
      <ChevronRight class="size-4" aria-hidden="true" />
    </RouterLink>
  </div>
</template>

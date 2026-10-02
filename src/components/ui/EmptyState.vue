<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{ icon: Component; title: string; text?: string }>()
</script>

<template>
  <div class="flex flex-col items-center gap-2 px-4 py-8 text-center">
    <span class="flex size-10 items-center justify-center rounded-full bg-fill text-muted">
      <component :is="icon" class="size-5" aria-hidden="true" />
    </span>
    <p class="font-medium">{{ title }}</p>
    <p v-if="text" class="max-w-md text-xs text-muted">{{ text }}</p>
    <slot />
  </div>
</template>

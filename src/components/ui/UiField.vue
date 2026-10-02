<script setup lang="ts">
/** Label + control + error line. Put any input in the default slot. */
defineProps<{
  label: string
  error?: string
  hint?: string
  /** The hint only helps with a physical keyboard (typing shortcuts): hide it on phones. */
  hintFromSm?: boolean
}>()
</script>

<template>
  <label class="block min-w-0">
    <span class="label">{{ label }}</span>
    <slot />
    <span v-if="error" class="mt-1 block text-xs text-danger" role="alert">{{ error }}</span>
    <span v-else-if="hint" :class="['mt-1 text-xs text-muted', hintFromSm ? 'hidden sm:block' : 'block']">{{ hint }}</span>
  </label>
</template>

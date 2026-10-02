<script setup lang="ts" generic="T extends string">
/** Small group of mutually exclusive options (range, kind). */
defineProps<{ options: { value: T; label: string }[]; label: string }>()
const model = defineModel<T>({ required: true })
</script>

<template>
  <div role="group" :aria-label="label" class="inline-flex max-w-full gap-1 overflow-x-auto rounded-lg bg-fill p-1">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :aria-pressed="model === option.value"
      :class="[
        'h-8 shrink-0 whitespace-nowrap rounded-md px-3 text-[14px] font-medium transition-colors sm:h-6',
        model === option.value ? 'bg-primary text-primary-ink' : 'text-muted hover:text-ink',
      ]"
      @click="model = option.value"
    >
      {{ option.label }}
    </button>
  </div>
</template>

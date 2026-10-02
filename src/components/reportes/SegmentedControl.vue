<script setup lang="ts" generic="T extends string">
/** Small group of mutually exclusive options (range, kind). */
defineProps<{ options: { value: T; label: string }[]; label: string }>()
const model = defineModel<T>({ required: true })
</script>

<template>
  <div role="group" :aria-label="label" class="inline-flex max-w-full gap-1 rounded-lg bg-fill px-1">
    <!-- The button keeps the whole touch height; the pill inside is shorter so the control totals 40px, 32px from sm. -->
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :aria-pressed="model === option.value"
      class="group flex h-10 min-w-0 flex-auto items-center text-[14px] font-medium sm:h-8"
      @click="model = option.value"
    >
      <span
        :class="[
          'flex h-8 min-w-0 flex-auto items-center justify-center whitespace-nowrap rounded-md px-2 transition-colors sm:h-6 sm:px-3',
          model === option.value ? 'bg-primary text-primary-ink' : 'text-muted group-hover:text-ink',
        ]"
      >
        {{ option.label }}
      </span>
    </button>
  </div>
</template>

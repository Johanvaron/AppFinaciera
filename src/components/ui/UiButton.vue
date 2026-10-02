<script setup lang="ts">
import { computed } from 'vue'
import { LoaderCircle } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    type?: 'button' | 'submit'
    loading?: boolean
    disabled?: boolean
    /** Square button for a lone icon. Always pass aria-label with it. */
    icon?: boolean
  }>(),
  { variant: 'secondary', type: 'button' },
)

const variantClass = computed(
  () =>
    ({
      primary: 'bg-primary text-primary-ink hover:bg-primary/90',
      secondary: 'bg-fill text-ink hover:bg-line/70',
      ghost: 'text-muted hover:bg-fill hover:text-ink',
      danger: 'bg-danger-soft text-danger hover:bg-danger hover:text-surface',
    })[props.variant],
)
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="[
      'inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg text-[14px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 sm:h-8',
      icon ? 'w-10 sm:w-8' : 'px-3',
      variantClass,
    ]"
  >
    <LoaderCircle v-if="loading" class="size-4 animate-spin" aria-hidden="true" />
    <slot v-else />
  </button>
</template>

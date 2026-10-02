<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'

const open = defineModel<boolean>('open', { required: true })
withDefaults(defineProps<{ title: string; size?: 'sm' | 'md' | 'lg' }>(), { size: 'md' })

const panel = ref<HTMLElement>()
let lastFocused: HTMLElement | null = null

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    open.value = false
  }
}

watch(
  open,
  async (isOpen) => {
    if (isOpen) {
      lastFocused = document.activeElement as HTMLElement | null
      document.addEventListener('keydown', onKeydown)
      await nextTick()
      // Focus the first field so typing starts right away.
      const first = panel.value?.querySelector<HTMLElement>('[data-autofocus], input, select, textarea')
      ;(first ?? panel.value)?.focus()
    } else {
      document.removeEventListener('keydown', onKeydown)
      lastFocused?.focus()
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" @mousedown.self="open = false">
      <div
        ref="panel"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        tabindex="-1"
        :class="[
          'flex max-h-[92vh] w-full flex-col rounded-t-card bg-surface shadow-card sm:rounded-card',
          { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' }[size],
        ]"
      >
        <header class="flex items-center justify-between gap-3 px-4 pt-4">
          <h2 class="text-[16px] font-semibold">{{ title }}</h2>
          <button type="button" class="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-fill hover:text-ink" aria-label="Cerrar" @click="open = false">
            <X class="size-4" aria-hidden="true" />
          </button>
        </header>
        <div class="min-h-0 overflow-y-auto p-4">
          <slot />
        </div>
        <footer v-if="$slots.footer" class="flex flex-wrap justify-end gap-2 px-4 pb-4">
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </Teleport>
</template>

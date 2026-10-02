<script setup lang="ts">
/**
 * Small actions menu behind a "more" icon button. Closes with Esc or a click
 * outside; arrow keys move between the options.
 */
import { nextTick, onBeforeUnmount, ref, watch, type Component } from 'vue'
import { MoreVertical } from 'lucide-vue-next'

export interface MenuItem {
  key: string
  label: string
  icon: Component
  danger?: boolean
  disabled?: boolean
}

defineProps<{ label: string; items: MenuItem[] }>()
const emit = defineEmits<{ select: [key: string] }>()

const open = ref(false)
const root = ref<HTMLElement>()
const trigger = ref<HTMLButtonElement>()
const list = ref<HTMLElement>()

function options(): HTMLButtonElement[] {
  return Array.from(list.value?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? [])
}

function close(returnFocus: boolean) {
  open.value = false
  if (returnFocus) trigger.value?.focus()
}

function onOutside(event: MouseEvent) {
  if (!root.value?.contains(event.target as Node)) close(false)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    close(true)
    return
  }
  if (event.key === 'Tab') {
    close(false)
    return
  }
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const all = options()
  if (all.length === 0) return
  const current = all.indexOf(document.activeElement as HTMLButtonElement)
  let next = 0
  if (event.key === 'ArrowDown') next = (current + 1) % all.length
  else if (event.key === 'ArrowUp') next = (current - 1 + all.length) % all.length
  else if (event.key === 'End') next = all.length - 1
  all[next]?.focus()
}

watch(open, async (isOpen) => {
  if (isOpen) {
    document.addEventListener('mousedown', onOutside)
    await nextTick()
    options()[0]?.focus()
  } else {
    document.removeEventListener('mousedown', onOutside)
  }
})

onBeforeUnmount(() => document.removeEventListener('mousedown', onOutside))

function select(key: string) {
  close(true)
  emit('select', key)
}
</script>

<template>
  <div ref="root" class="relative shrink-0" @keydown="open && onKeydown($event)">
    <button
      ref="trigger"
      type="button"
      class="flex size-10 items-center justify-center rounded-lg text-muted hover:bg-fill hover:text-ink sm:size-8"
      aria-haspopup="menu"
      :aria-expanded="open"
      :aria-label="label"
      @click="open = !open"
    >
      <MoreVertical class="size-4" aria-hidden="true" />
    </button>
    <div v-if="open" ref="list" role="menu" :aria-label="label" class="absolute right-0 top-full z-30 mt-1 w-64 rounded-xl bg-surface p-1 shadow-[0_8px_24px_rgb(15_23_42/0.18)]">
      <button
        v-for="item in items"
        :key="item.key"
        type="button"
        role="menuitem"
        :disabled="item.disabled"
        :class="[
          'flex h-10 w-full items-center gap-2 rounded-lg px-2 text-left text-[14px] disabled:cursor-not-allowed disabled:opacity-50 sm:h-8',
          item.danger ? 'text-danger hover:bg-danger-soft focus-visible:bg-danger-soft' : 'hover:bg-fill focus-visible:bg-fill',
        ]"
        @click="select(item.key)"
      >
        <component :is="item.icon" class="size-4 shrink-0" aria-hidden="true" />
        <span class="min-w-0 truncate">{{ item.label }}</span>
      </button>
    </div>
  </div>
</template>

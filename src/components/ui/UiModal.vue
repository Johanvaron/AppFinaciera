<script lang="ts">
/** Keydown handlers of the open modals, bottom to top. Shared by every instance. */
const openModals: Array<(event: KeyboardEvent) => void> = []
</script>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'

const open = defineModel<boolean>('open', { required: true })
withDefaults(defineProps<{ title: string; size?: 'sm' | 'md' | 'lg' }>(), { size: 'md' })

const panel = ref<HTMLElement>()
let lastFocused: HTMLElement | null = null
let active = false

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function onKeydown(event: KeyboardEvent) {
  // Every open modal listens on document: only the one on top answers.
  if (openModals[openModals.length - 1] !== onKeydown) return
  if (event.key === 'Escape') {
    event.stopPropagation()
    open.value = false
  } else if (event.key === 'Tab') {
    trapFocus(event)
  }
}

/** Tab stays inside the dialog: it wraps at both ends and comes back if focus was outside. */
function trapFocus(event: KeyboardEvent) {
  const root = panel.value
  if (!root) return
  const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)]
  const first = items[0]
  const last = items[items.length - 1]
  const current = document.activeElement
  if (!first || !last) {
    event.preventDefault()
    root.focus()
  } else if (!root.contains(current) || current === root) {
    event.preventDefault()
    ;(event.shiftKey ? last : first).focus()
  } else if (event.shiftKey && current === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && current === last) {
    event.preventDefault()
    first.focus()
  }
}

function activate() {
  active = true
  lastFocused = document.activeElement as HTMLElement | null
  openModals.push(onKeydown)
  document.addEventListener('keydown', onKeydown)
}

function deactivate() {
  if (!active) return
  active = false
  const index = openModals.indexOf(onKeydown)
  if (index !== -1) openModals.splice(index, 1)
  document.removeEventListener('keydown', onKeydown)
  // The opener may be gone (a deleted row): then there is nothing to go back to.
  if (lastFocused?.isConnected) lastFocused.focus()
  lastFocused = null
}

watch(
  open,
  async (isOpen) => {
    if (!isOpen) return deactivate()
    activate()
    await nextTick()
    // Focus the marked field, else the first one, so typing starts right away.
    const root = panel.value
    const first = root?.querySelector<HTMLElement>('[data-autofocus]') ?? root?.querySelector<HTMLElement>('input, select, textarea')
    ;(first ?? root)?.focus()
  },
  { immediate: true },
)

// Unmounted while open (a parent v-if): still give the focus back.
onBeforeUnmount(deactivate)
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
          <button type="button" class="flex size-10 shrink-0 items-center sm:size-8 justify-center rounded-lg text-muted hover:bg-fill hover:text-ink" aria-label="Cerrar" @click="open = false">
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

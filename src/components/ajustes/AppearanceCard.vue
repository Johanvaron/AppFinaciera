<script setup lang="ts">
import { Moon, Sun } from 'lucide-vue-next'
import { useThemeStore } from '@/stores/theme'

const theme = useThemeStore()

const OPTIONS = [
  { dark: false, label: 'Claro', icon: Sun },
  { dark: true, label: 'Oscuro', icon: Moon },
]
const SHORTCUTS = [
  { key: 'N', text: 'nuevo movimiento' },
  { key: 'Esc', text: 'cerrar ventanas' },
  { key: 'Enter', text: 'guardar' },
]

function choose(dark: boolean) {
  if (theme.isDark !== dark) theme.toggleTheme()
}

/** Arrow keys move the selection, as in a native radio group (two options: any arrow goes to the other one). */
function onKeydown(event: KeyboardEvent) {
  if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) return
  event.preventDefault()
  const next = !theme.isDark
  choose(next)
  const buttons = (event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[role="radio"]')
  buttons[OPTIONS.findIndex((option) => option.dark === next)]?.focus()
}
</script>

<template>
  <section class="card flex min-w-0 flex-col gap-3" aria-labelledby="appearance-title">
    <h2 id="appearance-title" class="text-[16px] font-semibold">Apariencia</h2>
    <div class="flex rounded-lg bg-fill p-1" role="radiogroup" aria-label="Tema" @keydown="onKeydown">
      <button
        v-for="option in OPTIONS"
        :key="option.label"
        type="button"
        role="radio"
        :aria-checked="theme.isDark === option.dark"
        :tabindex="theme.isDark === option.dark ? 0 : -1"
        :class="[
          'flex h-10 flex-1 items-center justify-center gap-1.5 rounded-md text-[14px] font-medium transition-colors sm:h-8',
          theme.isDark === option.dark ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink',
        ]"
        @click="choose(option.dark)"
      >
        <component :is="option.icon" class="size-4" aria-hidden="true" />
        {{ option.label }}
      </button>
    </div>

    <h3 class="text-xs font-semibold text-muted">Atajos del teclado</h3>
    <ul class="flex flex-col gap-1.5">
      <li v-for="shortcut in SHORTCUTS" :key="shortcut.key" class="flex items-center gap-2">
        <kbd class="inline-flex h-6 min-w-8 items-center justify-center rounded-md bg-fill px-1.5 font-sans text-xs font-semibold">{{ shortcut.key }}</kbd>
        <span class="text-muted">{{ shortcut.text }}</span>
      </li>
    </ul>
  </section>
</template>

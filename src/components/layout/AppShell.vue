<script setup lang="ts">
/**
 * Frame of the app: fixed side rail on desktop, bottom tab bar on phones.
 * The content column takes the whole remaining width (no max-width).
 */
import { onBeforeUnmount, onMounted } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { Moon, Plus, Sun, Wallet } from 'lucide-vue-next'
import TransactionModal from '@/components/movimientos/TransactionModal.vue'
import ToastHost from '@/components/ui/ToastHost.vue'
import { NAV_ITEMS } from '@/router'
import { useQuickAdd } from '@/stores/quickAdd'
import { useThemeStore } from '@/stores/theme'

const theme = useThemeStore()
const quickAdd = useQuickAdd()

/** "N" opens a new movement, unless the person is typing somewhere. */
function onKeydown(event: KeyboardEvent) {
  if (event.key.toLowerCase() !== 'n' || event.ctrlKey || event.metaKey || event.altKey) return
  const target = event.target as HTMLElement | null
  if (target?.closest('input, select, textarea, [contenteditable="true"]') || quickAdd.open) return
  if (document.querySelector('[role="dialog"]')) return
  event.preventDefault()
  quickAdd.openNew()
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="flex min-h-screen">
    <aside class="sticky top-0 hidden h-screen w-56 shrink-0 flex-col gap-4 bg-surface p-3 lg:flex">
      <div class="flex items-center gap-2 px-2 pt-1">
        <span class="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-ink">
          <Wallet class="size-4" aria-hidden="true" />
        </span>
        <span class="text-[15px] font-semibold">Mis finanzas</span>
      </div>

      <button type="button" class="flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-2 text-[14px] font-medium text-primary-ink hover:bg-primary/90" @click="quickAdd.openNew()">
        <Plus class="size-4" aria-hidden="true" />
        Nuevo movimiento
        <kbd class="ml-1 rounded bg-primary-ink/20 px-1 text-xs">N</kbd>
      </button>

      <nav class="flex flex-1 flex-col gap-1" aria-label="Secciones">
        <RouterLink
          v-for="item in NAV_ITEMS"
          :key="item.to"
          :to="item.to"
          class="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[14px] font-medium text-muted hover:bg-fill hover:text-ink"
          active-class="!bg-primary-soft !text-primary"
        >
          <component :is="item.icon" class="size-4" aria-hidden="true" />
          {{ item.label }}
        </RouterLink>
      </nav>

      <button type="button" class="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[14px] font-medium text-muted hover:bg-fill hover:text-ink" @click="theme.toggleTheme()">
        <component :is="theme.isDark ? Sun : Moon" class="size-4" aria-hidden="true" />
        {{ theme.isDark ? 'Modo claro' : 'Modo oscuro' }}
      </button>
    </aside>

    <main class="min-w-0 flex-1 pb-20 lg:pb-0">
      <RouterView />
    </main>

    <!-- Phone: tab bar + floating add button -->
    <nav class="fixed inset-x-0 bottom-0 z-40 flex bg-surface shadow-[0_-1px_3px_rgb(15_23_42/0.08)] lg:hidden" aria-label="Secciones">
      <RouterLink
        v-for="item in NAV_ITEMS"
        :key="item.to"
        :to="item.to"
        class="flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-muted"
        active-class="!text-primary"
      >
        <component :is="item.icon" class="size-5" aria-hidden="true" />
        <span class="max-w-full truncate px-0.5 text-[11px] font-medium">{{ item.short }}</span>
      </RouterLink>
    </nav>
    <button
      type="button"
      class="fixed bottom-[4.5rem] right-4 z-40 flex size-12 items-center justify-center rounded-full bg-primary text-primary-ink shadow-card lg:hidden"
      aria-label="Nuevo movimiento"
      @click="quickAdd.openNew()"
    >
      <Plus class="size-6" aria-hidden="true" />
    </button>

    <TransactionModal />
    <ToastHost />
  </div>
</template>

<script setup lang="ts">
import { CircleAlert, CircleCheck, X } from 'lucide-vue-next'
import { useToasts } from '@/lib/toasts'

const toasts = useToasts()
</script>

<template>
  <div class="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6" aria-live="polite">
    <div
      v-for="toast in toasts.items"
      :key="toast.id"
      :role="toast.kind === 'error' ? 'alert' : 'status'"
      class="pointer-events-auto flex max-w-md items-center gap-2 rounded-lg bg-ink px-3 py-2 text-[14px] text-bg shadow-card"
    >
      <component :is="toast.kind === 'error' ? CircleAlert : CircleCheck" class="size-4 shrink-0" aria-hidden="true" />
      <span class="min-w-0">{{ toast.message }}</span>
      <button type="button" class="ml-1 shrink-0 opacity-70 hover:opacity-100" aria-label="Cerrar aviso" @click="toasts.dismiss(toast.id)">
        <X class="size-4" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

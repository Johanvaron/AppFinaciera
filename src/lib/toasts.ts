import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Toast {
  id: number
  kind: 'success' | 'error'
  message: string
}

const SUCCESS_MS = 2500
const ERROR_MS = 6000

export const useToasts = defineStore('toasts', () => {
  const items = ref<Toast[]>([])
  let nextId = 1

  function push(kind: Toast['kind'], message: string) {
    const id = nextId++
    items.value.push({ id, kind, message })
    setTimeout(() => dismiss(id), kind === 'error' ? ERROR_MS : SUCCESS_MS)
  }

  function dismiss(id: number) {
    items.value = items.value.filter((t) => t.id !== id)
  }

  return {
    items,
    dismiss,
    success: (message: string) => push('success', message),
    error: (message: string) => push('error', message),
  }
})

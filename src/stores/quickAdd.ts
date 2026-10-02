import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { IsoDate, Transaction, TransactionType } from '@shared/contract'

export interface QuickAddDefaults {
  type?: TransactionType
  categoryId?: number
  accountId?: number
  date?: IsoDate
}

/** Opens the single movement modal (mounted once in AppShell) from any screen. */
export const useQuickAdd = defineStore('quickAdd', () => {
  const open = ref(false)
  const editing = ref<Transaction | null>(null)
  const defaults = ref<QuickAddDefaults>({})

  function openNew(preset: QuickAddDefaults = {}) {
    editing.value = null
    defaults.value = preset
    open.value = true
  }

  function openEdit(transaction: Transaction) {
    editing.value = transaction
    defaults.value = {}
    open.value = true
  }

  function close() {
    open.value = false
  }

  return { open, editing, defaults, openNew, openEdit, close }
})

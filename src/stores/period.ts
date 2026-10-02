import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { Month } from '@shared/contract'
import { addMonths, currentMonth, monthLabel } from '@/lib/format'

const STORAGE_KEY = 'finanzas-month'
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/

function readStored(): Month | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    return stored && MONTH_RE.test(stored) ? stored : null
  } catch {
    return null
  }
}

/** The month every screen is looking at. Lives for the browser session. */
export const usePeriodStore = defineStore('period', () => {
  const month = ref<Month>(readStored() ?? currentMonth())

  watch(month, (value) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, value)
    } catch {
      // Private mode: the month just resets on reload.
    }
  })

  const label = computed(() => monthLabel(month.value))
  const isCurrent = computed(() => month.value === currentMonth())

  return {
    month,
    label,
    isCurrent,
    previous: () => (month.value = addMonths(month.value, -1)),
    next: () => (month.value = addMonths(month.value, 1)),
    goToCurrent: () => (month.value = currentMonth()),
  }
})

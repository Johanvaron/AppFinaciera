import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'theme'

export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(false)

  function apply() {
    document.documentElement.classList.toggle('dark', isDark.value)
  }

  /** Saved choice first, then the system preference. */
  function initTheme() {
    let saved: string | null = null
    try {
      saved = localStorage.getItem(STORAGE_KEY)
    } catch {
      // Storage blocked: fall back to the system preference.
    }
    isDark.value = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
    apply()
  }

  function toggleTheme() {
    isDark.value = !isDark.value
    try {
      localStorage.setItem(STORAGE_KEY, isDark.value ? 'dark' : 'light')
    } catch {
      // The theme still changes for this session.
    }
    apply()
  }

  return { isDark, initTheme, toggleTheme }
})

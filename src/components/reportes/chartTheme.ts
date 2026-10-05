import { computed } from 'vue'
import { tokenColor } from '@/lib/palette'
import { useThemeStore } from '@/stores/theme'

/** Chart colors read from the design tokens, recomputed when the theme flips. */
export function useChartColors() {
  const theme = useThemeStore()
  return computed(() => {
    void theme.isDark // dependency: the tokens change with the theme class
    return {
      ink: tokenColor('ink'),
      muted: tokenColor('muted'),
      grid: tokenColor('fill'),
      primary: tokenColor('primary'),
      success: tokenColor('success'),
    }
  })
}

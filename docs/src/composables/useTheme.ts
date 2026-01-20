import { useLocalStorage, usePreferredDark } from '@vueuse/core'
import type { Ref } from 'vue'
import { watch } from 'vue'
import { STORAGE_KEYS, type ThemeOption } from '../lib/constants'

export function useTheme(): { theme: Ref<ThemeOption> } {
  const theme = useLocalStorage<ThemeOption>(STORAGE_KEYS.THEME, 'system')
  const prefersDark = usePreferredDark()

  function applyTheme(mode: ThemeOption): void {
    const root = document.documentElement
    const isDark = mode === 'system' ? prefersDark.value : mode === 'dark'
    root.classList.toggle('dark', isDark)
  }

  // Apply theme on mount and when it changes
  watch(
    [theme, prefersDark],
    () => {
      applyTheme(theme.value)
    },
    { immediate: true },
  )

  return {
    theme,
  }
}

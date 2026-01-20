import { useLocalStorage } from '@vueuse/core'
import { createI18n } from 'vue-i18n'
import { LOCALES, type Locale, STORAGE_KEYS } from './lib/constants'
import en from './locales/en'
import zh from './locales/zh'

const messages = {
  en,
  zh,
}

function getDefaultLocale(): Locale {
  // Try to get from localStorage first
  if (typeof window !== 'undefined') {
    const savedLocale = useLocalStorage<Locale | null>(STORAGE_KEYS.LOCALE, null).value
    if (savedLocale && LOCALES.includes(savedLocale)) {
      return savedLocale
    }
  }

  if (typeof navigator !== 'undefined') {
    const browserLocale = navigator.language.split('-')[0] as Locale
    if (LOCALES.includes(browserLocale)) {
      return browserLocale
    }
  }

  return 'en'
}

export const i18n = createI18n({
  legacy: false,
  locale: getDefaultLocale(),
  fallbackLocale: 'en',
  messages,
})

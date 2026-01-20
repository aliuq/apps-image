<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { useLocalStorage } from '@vueuse/core'
import { watch } from 'vue'
import { useI18n } from 'vue-i18n'
import LucideGithub from '~icons/lucide/github'
import LucideLanguages from '~icons/lucide/languages'
import { REPO, STORAGE_KEYS } from '../lib/constants'
import type { Locale, ThemeOption } from '../lib/constants'
import ThemeToggle from './ThemeToggle.vue'

const { t, locale } = useI18n()
const theme = defineModel<ThemeOption>('theme', { required: true })
const savedLocale = useLocalStorage<Locale>(STORAGE_KEYS.LOCALE, 'en')

const toggleLocale = () => {
  locale.value = locale.value === 'en' ? 'zh' : 'en'
}

// Sync locale to localStorage
watch(locale, (newLocale) => {
  savedLocale.value = newLocale as Locale
})
</script>

<template>
  <header class="py-6 border-b">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <img
          src="../assets/logo.svg"
          alt="Apps Image Logo"
          class="size-10 transition-transform duration-200 hover:scale-105"
          loading="lazy"
        />
        <div>
          <h1 class="text-2xl font-bold tracking-tight font-archivo">
            {{ t('header.title') }}
          </h1>
          <p class="text-xs text-muted-foreground mt-0.5">{{ t('header.subtitle') }}</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <ThemeToggle v-model="theme" />
        <Button variant="ghost" size="sm" @click="toggleLocale" class="cursor-pointer">
          <LucideLanguages class="size-4" />
          <span class="ml-2">{{ locale === 'en' ? '中文' : 'EN' }}</span>
        </Button>
        <Button
          as="a"
          :href="REPO.BASE"
          target="_blank"
          rel="noreferrer"
          variant="ghost"
          size="icon"
          class="cursor-pointer"
          aria-label="View source on GitHub"
        >
          <LucideGithub class="size-5" />
        </Button>
      </div>
    </div>
  </header>
</template>

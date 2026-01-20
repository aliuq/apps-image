<script setup lang="ts">
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { computed } from 'vue'
import type { Component } from 'vue'
import { useI18n } from 'vue-i18n'
import LucideMonitor from '~icons/lucide/monitor'
import LucideMoon from '~icons/lucide/moon'
import LucideSun from '~icons/lucide/sun'
import type { ThemeOption } from '../lib/constants'

const theme = defineModel<ThemeOption>()
const { t } = useI18n()

interface ThemeConfig {
  value: ThemeOption
  label: string
  icon: Component
}

const themeOptions: readonly ThemeConfig[] = [
  { value: 'system', label: t('theme.system'), icon: LucideMonitor },
  { value: 'light', label: t('theme.light'), icon: LucideSun },
  { value: 'dark', label: t('theme.dark'), icon: LucideMoon },
]

const currentTheme = computed(() => {
  return themeOptions.find((opt) => opt.value === theme.value)
})
</script>

<template>
  <Select v-model="theme">
    <SelectTrigger size="sm" class="w-35">
      <div class="flex items-center gap-2">
        <component :is="currentTheme?.icon" class="size-4" />
        <SelectValue :placeholder="t('theme.system')"></SelectValue>
      </div>
    </SelectTrigger>
    <SelectContent>
      <SelectItem v-for="option in themeOptions" :key="option.value" :value="option.value">
        <div class="flex items-center gap-2">
          <component :is="option.icon" class="size-4" />
          <span>{{ option.label }}</span>
        </div>
      </SelectItem>
    </SelectContent>
  </Select>
</template>

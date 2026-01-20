<script setup lang="ts">
import { Card, CardContent } from '@/components/ui/card'
import { useI18n } from 'vue-i18n'
import type { Stats } from '../composables/useStats'

interface Props {
  stats: Stats
}

defineProps<Props>()
const { t } = useI18n()
</script>

<template>
  <section class="py-8">
    <div class="grid gap-4 sm:grid-cols-3">
      <Card class="border bg-card">
        <CardContent class="p-6">
          <div class="text-sm text-muted-foreground mb-1">{{ t('stats.totalImages') }}</div>
          <div class="text-3xl font-bold font-archivo">{{ stats.total }}</div>
        </CardContent>
      </Card>

      <Card class="border bg-card">
        <CardContent class="p-6">
          <div class="text-sm text-muted-foreground mb-1">{{ t('stats.appImages') }}</div>
          <div class="text-3xl font-bold font-archivo">{{ stats.apps }}</div>
        </CardContent>
      </Card>

      <Card class="border bg-card">
        <CardContent class="p-6">
          <div class="text-sm text-muted-foreground mb-1">{{ t('stats.baseImages') }}</div>
          <div class="text-3xl font-bold font-archivo">{{ stats.base }}</div>
        </CardContent>
      </Card>
    </div>
  </section>
</template>

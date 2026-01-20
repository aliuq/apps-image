<script setup lang="ts">
import { Empty, EmptyDescription, EmptyMedia } from '@/components/ui/empty'
import { useI18n } from 'vue-i18n'
import LucideArrowRight from '~icons/lucide/arrow-right'
import LucideSearch from '~icons/lucide/search'
import type { AppItem } from '../data/types'
import { REPO } from '../lib/constants'
import AppCard from './AppCard.vue'

interface Props {
  apps: AppItem[]
}

defineProps<Props>()
const { t } = useI18n()
</script>

<template>
  <!-- List header -->
  <section class="mb-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-baseline gap-2">
        <h2 class="text-lg font-semibold font-archivo">{{ t('list.title') }}</h2>
        <span class="text-sm text-muted-foreground">{{ apps.length }} {{ t('common.results') }}</span>
      </div>
      <a
        :href="REPO.BASE"
        target="_blank"
        rel="noreferrer"
        class="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground cursor-pointer"
        aria-label="View source data on GitHub"
      >
        {{ t('list.sourceData') }}
        <LucideArrowRight class="size-3.5" />
      </a>
    </div>
  </section>

  <!-- Card grid -->
  <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pb-16" v-if="apps.length > 0">
    <AppCard v-for="item in apps" :key="item.id" :item="item" />
  </section>

  <!-- Empty state -->
  <section v-else class="py-16">
    <Empty class="mx-auto max-w-md">
      <EmptyMedia variant="icon">
        <LucideSearch class="size-8 text-muted-foreground/50" />
      </EmptyMedia>
      <EmptyDescription class="mt-4">
        {{ t('common.noResults') }}
      </EmptyDescription>
    </Empty>
  </section>
</template>

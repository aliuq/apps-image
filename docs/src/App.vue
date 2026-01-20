<script setup lang="ts">
import AppHeader from './components/AppHeader.vue'
import AppList from './components/AppList.vue'
import FilterSection from './components/FilterSection.vue'
import StatsSection from './components/StatsSection.vue'
import { useFilters } from './composables/useFilters'
import { useStats } from './composables/useStats'
import { useTheme } from './composables/useTheme'
import { apps } from './data/apps'

const { theme } = useTheme()
const { query, typeFilter, methodFilter, methodOptions, filteredApps } = useFilters(apps)
const stats = useStats(apps)
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <div class="relative">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <AppHeader v-model:theme="theme" />

        <StatsSection :stats="stats" />

        <FilterSection
          v-model:query="query"
          v-model:type-filter="typeFilter"
          v-model:method-filter="methodFilter"
          :method-options="methodOptions"
        />

        <AppList :apps="filteredApps" />
      </div>
    </div>
  </div>
</template>

import { type ComputedRef, type Ref, computed, ref } from 'vue'
import type { AppItem } from '../data/types'

export interface FilterOptions {
  typeFilter: Ref<'all' | 'app' | 'base'>
  methodFilter: Ref<string>
  query: Ref<string>
}

export interface UseFiltersReturn {
  query: Ref<string>
  typeFilter: Ref<'all' | 'app' | 'base'>
  methodFilter: Ref<string>
  methodOptions: ComputedRef<string[]>
  filteredApps: ComputedRef<AppItem[]>
  clearFilters: () => void
}

/**
 * Composable for filtering applications
 */
export function useFilters(apps: AppItem[]): UseFiltersReturn {
  const query = ref('')
  const typeFilter = ref<'all' | 'app' | 'base'>('all')
  const methodFilter = ref('all')

  const methodOptions = computed(() => {
    const unique = new Set(apps.map((app) => app.checkMethod))
    return ['all', ...Array.from(unique)]
  })

  const filteredApps = computed(() => {
    const keyword = query.value.trim().toLowerCase()

    return apps.filter((app) => {
      const matchesType = typeFilter.value === 'all' || app.type === typeFilter.value
      const matchesMethod = methodFilter.value === 'all' || app.checkMethod === methodFilter.value

      if (keyword.length === 0) {
        return matchesType && matchesMethod
      }

      const variantKeys = Object.keys(app.variants).join(' ').toLowerCase()
      const searchableText = [
        app.title,
        app.name,
        app.description,
        app.slogan,
        app.license,
        app.latestVersion,
        app.version,
        variantKeys,
      ]
        .join(' ')
        .toLowerCase()

      return matchesType && matchesMethod && searchableText.includes(keyword)
    })
  })

  const clearFilters = () => {
    query.value = ''
    typeFilter.value = 'all'
    methodFilter.value = 'all'
  }

  return {
    query,
    typeFilter,
    methodFilter,
    methodOptions,
    filteredApps,
    clearFilters,
  }
}

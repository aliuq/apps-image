import { type ComputedRef, computed } from 'vue'
import type { AppItem } from '../data/types'

export interface Stats {
  total: number
  apps: number
  base: number
}

/**
 * Composable for computing application statistics
 */
export function useStats(apps: AppItem[]): ComputedRef<Stats> {
  return computed(() => {
    const appCount = apps.filter((app) => app.type === 'app').length
    const baseCount = apps.filter((app) => app.type === 'base').length

    return {
      total: apps.length,
      apps: appCount,
      base: baseCount,
    }
  })
}

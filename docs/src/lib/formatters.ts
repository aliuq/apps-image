import type { Composer } from 'vue-i18n'

/**
 * Format type option for display
 */
export function formatTypeOption(value: string, t: Composer['t']): string {
  if (value === 'all') return t('common.all')
  if (value === 'app') return t('type.apps')
  if (value === 'base') return t('type.baseImages')
  return value
}

/**
 * Format check method option for display
 */
export function formatMethodOption(value: string, t: Composer['t']): string {
  if (value === 'all') return t('common.all')
  const key = `checkMethod.${value}` as `checkMethod.${string}`
  return t(key, value)
}

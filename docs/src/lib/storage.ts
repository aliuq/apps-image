/**
 * Safe localStorage wrapper with error handling
 */
export const Storage = {
  /**
   * Get item from localStorage
   */
  get<T = string>(key: string, defaultValue?: T): T | null {
    try {
      const item = window.localStorage.getItem(key)
      if (item === null) return defaultValue ?? null
      try {
        return JSON.parse(item) as T
      } catch {
        return item as T
      }
    } catch (error) {
      console.warn(`Failed to get localStorage item "${key}":`, error)
      return defaultValue ?? null
    }
  },

  /**
   * Set item to localStorage
   */
  set(key: string, value: unknown): boolean {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value)
      window.localStorage.setItem(key, serialized)
      return true
    } catch (error) {
      console.warn(`Failed to set localStorage item "${key}":`, error)
      return false
    }
  },

  /**
   * Remove item from localStorage
   */
  remove(key: string): boolean {
    try {
      window.localStorage.removeItem(key)
      return true
    } catch (error) {
      console.warn(`Failed to remove localStorage item "${key}":`, error)
      return false
    }
  },

  /**
   * Check if localStorage is available
   */
  isAvailable(): boolean {
    try {
      const test = '__storage_test__'
      window.localStorage.setItem(test, test)
      window.localStorage.removeItem(test)
      return true
    } catch {
      return false
    }
  },
}

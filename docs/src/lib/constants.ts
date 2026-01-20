/**
 * Application constants
 */

// Storage keys
export const STORAGE_KEYS = {
  THEME: 'apps-image-theme',
  LOCALE: 'apps-image-locale',
} as const

// Repository information
export const REPO = {
  BASE: 'https://github.com/aliuq/apps-image',
  TREE: 'https://github.com/aliuq/apps-image/tree/master',
  OWNER: 'aliuq',
  NAME: 'apps-image',
} as const

// Docker Hub
export const DOCKER = {
  REGISTRY: 'aliuq',
  HUB_URL: 'https://hub.docker.com/r/aliuq',
  SHIELDS_API: 'https://img.shields.io/docker',
} as const

// Supported locales
export const LOCALES = ['en', 'zh'] as const
export type Locale = (typeof LOCALES)[number]

// Theme options
export const THEMES = ['system', 'light', 'dark'] as const
export type ThemeOption = (typeof THEMES)[number]

// Default values
export const DEFAULTS = {
  DESCRIPTION: 'No description',
  SLOGAN: 'No slogan',
  VERSION: 'unknown',
} as const

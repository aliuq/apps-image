import data from '../../data.json'
import { DEFAULTS, DOCKER, REPO } from '../lib/constants'
import type { AppItem, DataFile, Meta, Variant } from './types'

const dataFile = data as unknown as DataFile

function pickVariant(variants?: Record<string, Variant>): { key: string; value?: Variant } {
  const entries = Object.entries(variants ?? {})
  if (entries.length === 0) {
    return { key: 'latest', value: undefined }
  }

  if (variants?.latest) {
    return { key: 'latest', value: variants.latest }
  }

  const first = entries[0]!
  return { key: first[0], value: first[1] }
}

function normalize(meta: Meta, variantName: string, variant?: Variant): AppItem {
  const type = meta.category ?? (meta.type === 'base' ? 'base' : 'app')
  const description = meta.description ?? meta.slogan ?? DEFAULTS.DESCRIPTION
  const slogan = meta.slogan ?? meta.description ?? DEFAULTS.SLOGAN
  const license = meta.license
  const checkMethod = variant?.checkver?.type ?? 'manual'
  const sourceUrl = normalizeRepo(variant?.checkver?.repo)
  const latestVersion = variant?.version ?? DEFAULTS.VERSION
  const sha = variant?.sha ?? DEFAULTS.VERSION
  const docPath = meta.readmePath ?? `${type === 'base' ? 'base' : 'apps'}/${meta.name}`
  const docUrl = `${REPO.TREE}/${docPath}`
  const ghcrUrl = `https://ghcr.io/${DOCKER.REGISTRY}/${meta.name}`
  const dockerTags = variant?.docker?.tags ?? []
  const imageSize = variant?.docker?.size ?? DEFAULTS.VERSION

  return {
    id: `${type}-${meta.name}-${variantName}`,
    name: meta.name,
    title: meta.title ?? meta.name,
    type,
    description,
    slogan,
    license,
    version: variantName,
    latestVersion,
    sha,
    checkMethod,
    sourceUrl,
    docUrl,
    ghcrUrl,
    dockerTags,
    imageSize,
    variants: meta.variants || {},
  }
}

function normalizeRepo(repo?: string): string | undefined {
  if (!repo) {
    return undefined
  }

  if (repo.startsWith('http://') || repo.startsWith('https://')) {
    return repo
  }

  return `https://github.com/${repo}`
}

export const apps: AppItem[] = dataFile.apps
  .filter((meta) => Boolean(meta?.name) && !('skip' in meta && meta.skip))
  .map((meta) => {
    const picked = pickVariant(meta.variants)
    return normalize(meta, picked.key, picked.value)
  })
  .sort((a, b) => a.title.localeCompare(b.title, 'en'))

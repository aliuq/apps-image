export interface Checkver {
  type?: string
  repo?: string
  file?: string
}

export interface DockerConfig {
  tags?: string[]
  images?: string[]
  size?: string
}

export interface Variant {
  version?: string
  sha?: string
  checkver?: Checkver
  docker?: DockerConfig
  enabled?: boolean
}

export interface Meta {
  name: string
  type?: 'app' | 'base'
  category?: 'app' | 'base'
  title?: string
  slogan?: string
  description?: string
  license?: string
  variants?: Record<string, Variant>
  readmePath?: string
  hasReadme?: boolean
  updatedAt?: string
}

export interface DataFile {
  generated: string
  total: number
  apps: Meta[]
}

export interface AppItem {
  id: string
  name: string
  title: string
  type: 'app' | 'base'
  description: string
  slogan: string
  license?: string
  version: string
  latestVersion: string
  sha: string
  checkMethod: string
  sourceUrl?: string
  docUrl: string
  ghcrUrl?: string
  acrUrl?: string
  dockerTags: string[]
  imageSize: string
  variants: Record<string, Variant>
  updatedAt?: string
}

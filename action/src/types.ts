export interface Meta {
  name: string
  repo: string
  version: string
  sha: string
  skip?: boolean
  checkVer: {
    type: 'version' | 'sha' | 'tag'
    file?: string
  }
  dockerMeta: {
    images: string[]
    tags: string[]
    labels: Record<string, string>
    context: string
    dockerfile: string
    push: boolean
    platforms: string[]
  }
}

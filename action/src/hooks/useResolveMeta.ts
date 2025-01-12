import type { Meta } from '../types.js'
import path from 'node:path'
import process from 'node:process'
import * as core from '@actions/core'
import fsa from 'fs-extra'

export default async function useResolveMeta(meta: Meta): Promise<UseResolveMetaReturn> {
  const metaName = meta.name
  const docker = meta.dockerMeta
  const context = docker.context
  const dockerfile = path.join(context, docker.dockerfile || 'Dockerfile')

  const data: UseResolveMetaReturn = {
    images: !docker?.images?.length
      ? [`aliuq/${metaName}`, `ghcr.io/aliuq/${metaName}`].join('\n')
      : docker.images.join('\n'),
    platforms: !docker?.platforms?.length ? 'linux/amd64,linux/arm64' : docker.platforms.join(','),
    context,
    file: dockerfile,
    push: docker.push,
    tags: docker.tags.join('\n'),
    labels: '',
    annotations: '',
    readme_path: '',
  }

  if (!docker.push) {
    // If `push` is `false`, only build for linux/amd64
    data.platforms = 'linux/amd64'
  }

  if (docker.readme_path !== false) {
    const readmePath = path.join(context, docker.readme_path || 'README.md')
    if (fsa.existsSync(readmePath)) {
      data.readme_path = readmePath
    }
  }

  // Labels
  const labelPrefix = 'org.opencontainers.image'
  const annotationsPrefix = 'org.opencontainers.image'
  const defaultLabels = {
    // https://github.com/aliuq/apps-image/tree/master/apps/cobalt
    url: `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/tree/master/${context}`,
    revision: meta.sha,
    upstream: meta.repo,
    version: meta.version,
  }
  docker.labels = Object.assign({}, defaultLabels, docker.labels)

  const labels: any = []
  const annotations: any = []
  for (const [key, value] of Object.entries(docker.labels)) {
    labels.push(`${labelPrefix}.${key}=${value}`)
    annotations.push(`${annotationsPrefix}.${key}=${value}`)
  }

  data.labels = labels.join('\n')
  data.annotations = annotations.join('\n')

  core.group('Post Docker Meta', async () => core.info(JSON.stringify(data, null, 2)))

  return data
}

interface UseResolveMetaReturn {
  images: string
  platforms: string
  context: string
  file: string
  push: boolean
  tags: string
  labels: string
  annotations: string
  readme_path: string
}

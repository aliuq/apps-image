import type { DockerConfig, Meta, Platform } from '../types/schema.js'

export interface MetaDefaultEnv {
  dockerUser?: string
  ghcrUser?: string
  acrRegistry?: string
  acrUser?: string
}

const DEFAULT_PLATFORMS: Platform[] = ['linux/amd64', 'linux/arm64']
const DEFAULT_META_ENV: Required<MetaDefaultEnv> = {
  dockerUser: 'aliuq',
  ghcrUser: 'aliuq',
  acrRegistry: 'registry.cn-hangzhou.aliyuncs.com',
  acrUser: 'aliuq',
}

function resolveMetaEnv(env: MetaDefaultEnv = {}): Required<MetaDefaultEnv> {
  return {
    dockerUser: env.dockerUser || DEFAULT_META_ENV.dockerUser,
    ghcrUser: env.ghcrUser || DEFAULT_META_ENV.ghcrUser,
    acrRegistry: env.acrRegistry || DEFAULT_META_ENV.acrRegistry,
    acrUser: env.acrUser || DEFAULT_META_ENV.acrUser,
  }
}

function getDefaultProcessFiles(variantName: string, isLatest: boolean) {
  return isLatest
    ? ['Dockerfile', 'pre.sh', 'post.sh']
    : [`Dockerfile.${variantName}`, `pre.${variantName}.sh`, `post.${variantName}.sh`]
}

function getDefaultImages(env: MetaDefaultEnv) {
  const resolvedEnv = resolveMetaEnv(env)

  return [
    resolvedEnv.dockerUser ? `${resolvedEnv.dockerUser}/{{name}}` : undefined,
    resolvedEnv.ghcrUser ? `ghcr.io/${resolvedEnv.ghcrUser}/{{name}}` : undefined,
    resolvedEnv.acrRegistry && resolvedEnv.acrUser ? `${resolvedEnv.acrRegistry}/${resolvedEnv.acrUser}/{{name}}` : undefined,
  ].filter(Boolean) as string[]
}

function getDefaultDockerConfig(variantName: string, isLatest: boolean, env: MetaDefaultEnv): DockerConfig {
  return {
    file: isLatest ? 'Dockerfile' : `Dockerfile.${variantName}`,
    images: getDefaultImages(env),
    tags: [`type=raw,value=${variantName}`, 'type=raw,value={{version}}'],
    platforms: DEFAULT_PLATFORMS,
  }
}

export function resolveMetaDefaults(context: string, meta: Meta, env: MetaDefaultEnv = {}) {
  const resolved = structuredClone(meta)
  resolved.context = resolved.context || context
  resolved.readme ??= 'README.md'
  resolved.skip ??= false

  for (const [variantName, variant] of Object.entries(resolved.variants)) {
    const isLatest = variantName === 'latest'
    const defaults = getDefaultDockerConfig(variantName, isLatest, env)

    variant.enabled ??= true
    variant.checkver.processFiles ??= getDefaultProcessFiles(variantName, isLatest)
    variant.docker = {
      ...defaults,
      push: true,
      load: false,
      ...variant.docker,
      images: variant.docker?.images || defaults.images,
      tags: variant.docker?.tags || defaults.tags,
      platforms: variant.docker?.platforms || defaults.platforms,
      file: variant.docker?.file || defaults.file,
    }
  }

  return resolved
}

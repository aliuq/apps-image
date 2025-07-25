import type { createPullRequest } from 'octokit-plugin-create-pull-request'

export type CreatePullRequestOptions = Parameters<ReturnType<typeof createPullRequest>['createPullRequest']>[0]

/**
 * 镜像类型枚举
 */
export type ImageType = 'app' | 'base' | 'sync'

/**
 * 版本检查类型
 */
export type CheckVersionType = 'version' | 'sha' | 'tag' | 'manual' | 'registry'

/**
 * 检查频率
 */
export type CheckFrequency = 'always' | 'daily' | 'weekly' | 'manual'

/**
 * 支持的平台
 */
export type Platform = 'linux/amd64' | 'linux/arm64' | 'linux/arm/v7' | 'linux/386'

/**
 * Git 仓库版本检查配置
 */
export interface GitVersionCheck {
  type: 'version' | 'sha' | 'tag'
  file?: string
  targetVersion?: string
  branch?: string
  tag_pattern?: string
  regex?: string
  /** 需要进行占位符替换的额外文件列表（相对于 context 目录） */
  processFiles?: string[]
}

/**
 * 基础镜像变体配置
 */
export interface BaseVariant {
  dockerfile: string
  tags?: string[]
  platforms?: Platform[]
  build_args?: Record<string, string>
}

/**
 * 基础镜像版本检查配置
 */
export interface BaseVersionCheck {
  type: 'manual'
  variants?: Record<string, BaseVariant>
  default_variant?: string
}

/**
 * 标签映射配置
 */
export interface TagMapping {
  source_tag: string
  target_tags?: string[]
  last_sha?: string
  last_sync?: string
  enabled?: boolean
}

/**
 * 同步镜像版本检查配置
 */
export interface SyncVersionCheck {
  type: 'registry'
  check_frequency?: CheckFrequency
  last_check?: string
  tag_mappings?: TagMapping[]
}

/**
 * 版本检查配置联合类型
 */
export type CheckVer = GitVersionCheck | BaseVersionCheck | SyncVersionCheck

/**
 * Docker 镜像元数据配置
 */
export interface DockerMeta {
  images: string[]
  tags: string[]
  labels?: Record<string, string>
  context: string
  dockerfile: string
  platforms: Platform[]
  build_args?: Record<string, string>
  push?: boolean
  readme_path?: string | false
}

/**
 * 认证配置
 */
export interface AuthConfig {
  username?: string
  password?: string
}

/**
 * 源镜像配置
 */
export interface SourceConfig {
  registry: string
  image: string
  auth?: AuthConfig
}

/**
 * 目标镜像配置
 */
export interface TargetConfig {
  registry: string
  image: string
  namespace?: string
  tag_prefix?: string
  tag_suffix?: string
  auth?: AuthConfig
}

/**
 * 重试配置
 */
export interface RetryConfig {
  max_attempts?: number
  delay_seconds?: number
}

/**
 * 同步镜像配置
 */
export interface SyncConfig {
  source: SourceConfig
  targets: TargetConfig[]
  retry?: RetryConfig
}

/**
 * 基础 Meta 接口
 */
interface SBaseMeta {
  name: string
  type: ImageType
  description?: string
  version: string
  skip?: boolean
  dockerMeta: DockerMeta
}

/**
 * App 类型 Meta 接口
 */
export interface AppMeta extends SBaseMeta {
  type: 'app'
  repo: string
  sha: string
  checkVer: GitVersionCheck
}

/**
 * Base 类型 Meta 接口
 */
export interface BaseMeta extends SBaseMeta {
  type: 'base'
  repo?: never
  sha?: never
  checkVer: BaseVersionCheck
  sync?: never
}

/**
 * Sync 类型 Meta 接口
 */
export interface SyncMeta extends SBaseMeta {
  type: 'sync'
  repo?: never
  sha?: never
  checkVer: SyncVersionCheck
  sync: SyncConfig
}

/**
 * Meta 联合类型
 */
export type Meta = AppMeta | BaseMeta | SyncMeta

/**
 * Action 类型
 */
export type Action = 'check-version' | 'resolve-meta'

/**
 * 检查结果状态
 */
export type CheckStatus = 'success' | 'error' | 'skipped'

/**
 * 版本检查结果接口
 */
export interface CheckResult {
  /**
   * 是否有更新
   */
  hasUpdate: boolean
  /**
   * 更新后的元数据
   */
  meta: Meta
  /**
   * 检查状态
   */
  status: CheckStatus
  /**
   * 如果状态为 'error'，则包含错误信息
   */
  error?: string
  /**
   * 跳过检查的标志
   */
  skipped?: boolean
  /**
   * 如果 skipped 为 true，则此字段应包含跳过的原因
   */
  reason?: string
  /**
   * 时间戳，检查持续时间（毫秒）
   */
  duration?: number
  /**
   * PR 创建结果
   */
  pr?: {
    data: CreatePullRequestOptions
    html_url?: string
    error?: string
  }
  /**
   * 保存原始的 meta 作为 oldMeta
   */
  oldMeta: Meta
}

/**
 * 类型守卫函数
 */
export function isAppMeta(meta: Meta): meta is AppMeta {
  return meta.type === 'app'
}

export function isBaseMeta(meta: Meta): meta is BaseMeta {
  return meta.type === 'base'
}

export function isSyncMeta(meta: Meta): meta is SyncMeta {
  return meta.type === 'sync'
}

/**
 * 验证 Meta 配置的工具函数
 */
export function validateMeta(meta: any): meta is Meta {
  if (!meta || typeof meta !== 'object') {
    return false
  }

  // 检查必需字段
  const requiredFields = ['name', 'type', 'version', 'dockerMeta']
  for (const field of requiredFields) {
    if (!(field in meta)) {
      return false
    }
  }

  // 检查 type 字段
  if (!['app', 'base', 'sync'].includes(meta.type)) {
    return false
  }

  // 根据类型检查特定字段
  switch (meta.type) {
    case 'app':
      return 'repo' in meta && 'sha' in meta
    case 'base':
      return true // base 类型只需要基础字段
    case 'sync':
      return 'sync' in meta
    default:
      return false
  }
}

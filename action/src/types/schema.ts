/**
 * 核心类型定义 - 严格基于 meta.schema.json 设计
 *
 * 这些类型直接映射 JSON Schema 结构，确保类型安全和一致性
 */

// ==================== 基础枚举类型 ====================

/** 镜像类型 */
export type ImageType = 'app' | 'base' | 'sync'

/** 版本检查类型 */
export type CheckVersionType = 'version' | 'sha' | 'tag' | 'manual' | 'registry'

/** 检查频率 */
export type CheckFrequency = 'always' | 'daily' | 'weekly' | 'manual'

/** 支持的平台 */
export type Platform
  = | 'linux/amd64'
    | 'linux/arm64'
    | 'linux/arm/v7'
    | 'linux/arm/v6'
    | 'linux/386'
    | 'linux/ppc64le'
    | 'linux/s390x'

// ==================== Schema 映射接口 ====================

/**
 * Docker 构建缓存配置 - 对应 Schema 中的 CacheConfig
 */
export interface CacheConfig {
  /** 缓存来源 */
  from?: string[]
  /** 缓存目标 */
  to?: string[]
}

/**
 * Docker 配置 - 对应 Schema 中的 DockerConfig
 */
export interface DockerConfig {
  /** Dockerfile 路径 */
  file?: string
  /** 镜像名称列表 */
  images?: string[]
  /** 标签模板列表 */
  tags?: string[]
  /** 支持的平台 */
  platforms?: Platform[]
  /** Docker 标签 */
  labels?: Record<string, string>
  /** 构建参数 */
  buildArgs?: Record<string, string>
  /** 构建密钥 */
  secrets?: string[]
  /** 输出配置 */
  outputs?: string[]
  /** 缓存配置 */
  cache?: CacheConfig
  /** 是否推送镜像 */
  push?: boolean
  /** 是否加载镜像到本地 */
  load?: boolean
}

/**
 * 版本检查配置 - 对应 Schema 中的 VersionCheck
 */
export interface VersionCheck {
  /** 版本检查类型 */
  type: CheckVersionType
  /** 上游仓库地址，支持完整 URI 或简写格式 */
  repo?: string
  /** 检查的分支 */
  branch?: string
  /** 版本文件路径（用于 version 类型） */
  file?: string
  /** 版本路径（用于 sha 类型） */
  path?: string
  /** 版本匹配正则表达式 */
  regex?: string
  /** 标签匹配模式（用于 tag 类型） */
  tagPattern?: string
  /** 目标版本（用于手动指定） */
  targetVersion?: string
  /** 需要处理占位符的文件列表 */
  processFiles?: string[]
  /** 检查频率 */
  checkFrequency?: CheckFrequency
  /** 上次检查时间（ISO 8601 格式） */
  lastCheck?: string
}

/**
 * 镜像变体配置 - 对应 Schema 中的 ImageVariant
 */
export interface ImageVariant {
  /** 当前版本 */
  version?: string
  /** 当前提交 SHA，7-40 位十六进制字符 */
  sha?: string
  /** 是否启用此变体 */
  enabled?: boolean
  /** 版本检查配置 */
  checkver: VersionCheck
  /** Docker 配置 */
  docker?: DockerConfig
}

/**
 * 主要的 Meta 接口 - 对应 Schema 根结构
 */
export interface Meta {
  /** 应用名称，用作默认的镜像名称 */
  name: string
  /** 镜像类型 */
  type: ImageType
  /** 应用显示名称 */
  title?: string
  /** 应用标语 */
  slogan?: string
  /** 应用描述 */
  description?: string
  /** 许可证 */
  license?: string
  /** 构建上下文路径，相对于仓库根目录 */
  context?: string
  /** README 文件路径或是否包含 README */
  readme?: string | boolean
  /** 镜像变体配置 */
  variants: Record<string, ImageVariant>
  /** 是否跳过此应用的处理 */
  skip?: boolean
}

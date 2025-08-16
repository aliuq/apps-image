/**
 * 类型定义入口
 */

import type { createPullRequest } from 'octokit-plugin-create-pull-request'
import type { GitCommitInfo } from './git.js'
import type { ImageVariant } from './schema.js'

export * from './git.js'
export * from './input.js'
export * from './schema.js'

export type CreatePullRequestOptions = Parameters<ReturnType<typeof createPullRequest>['createPullRequest']>[0]

/**
 * 检查变体更新的结果 (version)
 */
export interface CheckVariantResult {
  /**
   * 版本信息，检查后的版本
   */
  version: string
  /**
   * SHA 信息，检查后的提交 SHA
   */
  sha: string
  /**
   * 提交记录
   */
  commitInfo?: GitCommitInfo
  /**
   * 变体名称
   */
  variantName: string
  /**
   * 是否需要更新
   */
  needsUpdate: boolean
  /**
   * 变体配置，源配置，这里不做修改
   */
  variant: ImageVariant
  /**
   * 上下文信息
   */
  context: string
}

/**
 * 文件处理结果
 */
export interface ProcessedFile {
  /**
   * 文件路径，相对于项目根路径，而不是上下文路径
   * 例如：`apps/icones/Dockerfile`
   */
  path: string
  /**
   * 文件内容
   */
  content: string
  /**
   * 是否有变更
   */
  changed: boolean
  /**
   * 原始内容
   */
  originalContent: string
}

/**
 * 占位符数据接口
 *
 * - 用于替换文件内容中的占位符
 * - 键为占位符名称，值为包含新旧值的数组
 */
export type PlaceholderData = Record<
  string,
  [replacedValue: string] | [replacedValue: string, originalValue?: string]
>

/**
 * 配置管理模块
 */

import type { PushEvent } from '@octokit/webhooks-definitions/schema.js'
import type { CheckVersionInputs, ResolveMetadataInputs } from './types/input.js'
import process from 'node:process'
import core from '@actions/core'
import gh from '@actions/github'

type EventName = 'push' | 'pull_request' | 'workflow_dispatch' | 'schedule'

let _checkVersionConfig: CheckVersionInputs | undefined
let _resolveMetadataConfig: ResolveMetadataInputs | undefined

export const isAct = process.env.ACT === 'true'
export const ghContext = gh.context
export const eventName = ghContext.eventName as EventName
export const ghContextPayload = ghContext.payload as PushEvent
/**
 * 是否为 debug 模式
 *
 * 1. workflow_dispatch 事件下，debug 输入为 true
 * 2. core.isDebug()
 * 3. ACT 环境
 */
export const isDebug = (eventName === 'workflow_dispatch' && core.getBooleanInput('debug')) || core.isDebug() || isAct

/** 获取缓存目录 */
export const CaCheDir = process.env.CACHE_DIR || '.git-cache'

export const checkVersionConfig = getCheckVersionConfig()
export const resolveMetadataConfig = getResolveMetadataConfig()

/** 获取检查版本的 Action 配置 */
export function getCheckVersionConfig(): CheckVersionInputs {
  const context = core.getInput('context')
  const createPr = core.getInput('create_pr') ?? process.env.CREATE_PR
  // 本地使用并发可能出现问题
  const concurrency = process.env.CONCURRENCY ?? (isAct ? 1 : 3)

  const createPrMap: Record<string, any> = {
    true: true,
    false: false,
    development: 'development',
  }

  if (!_checkVersionConfig) {
    _checkVersionConfig = {
      token: core.getInput('token') || process.env.GITHUB_TOKEN,
      context: context === 'all' ? undefined : context,
      concurrency: +concurrency,
      createPr: createPrMap[createPr] ?? (['push', 'schedule'].includes(eventName)),
      debug: eventName === 'workflow_dispatch' ? core.getBooleanInput('debug') : undefined,
    }
  }
  return _checkVersionConfig
}

/** 获取解析元数据的 Action 配置 */
export function getResolveMetadataConfig(): ResolveMetadataInputs {
  const context = core.getInput('context')
  const variants = core.getInput('variants')

  if (!_resolveMetadataConfig) {
    _resolveMetadataConfig = {
      context,
      variants,
      debug: eventName === 'workflow_dispatch' ? core.getBooleanInput('debug') : undefined,
    }
  }

  return _resolveMetadataConfig
}

/**
 * 获取当前分支名称
 */
export function getCurrentBranch() {
  const ghContext = gh.context

  // 从不同的事件类型中获取分支信息
  let branch = 'master' // 默认值

  try {
    if (ghContext.eventName === 'push') {
      // push 事件：从 ref 中提取分支名
      // refs/heads/master -> master
      branch = ghContext.ref.replace('refs/heads/', '')
    }
    else if (ghContext.eventName === 'pull_request') {
      // PR 事件：获取目标分支
      branch = ghContext.payload.pull_request?.base?.ref || 'master'
    }
    else if (ghContext.eventName === 'workflow_dispatch') {
      // 手动触发：从 ref 中提取
      branch = ghContext.ref.replace('refs/heads/', '')
    }
    else {
      // 其他事件：尝试从 ref 中提取
      if (ghContext.ref.startsWith('refs/heads/')) {
        branch = ghContext.ref.replace('refs/heads/', '')
      }
    }

    // 如果分支名为空或者是 refs 格式，使用默认值
    if (!branch || branch.startsWith('refs/')) {
      branch = 'master'
    }
  }
  catch (error) {
    core.warning(`Failed to get current branch: ${error instanceof Error ? error.message : 'Unknown error'}`)
    branch = 'master'
  }

  return branch
}

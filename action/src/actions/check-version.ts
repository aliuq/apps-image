import type { CheckResult, Meta } from '../types.js'
import fs from 'node:fs'
import path from 'node:path'
import * as core from '@actions/core'
import * as gh from '@actions/github'
import fg from 'fast-glob'
import fsa from 'fs-extra'
import { cyan, green, red, yellow } from 'kolorist'
import { createPullRequest } from 'octokit-plugin-create-pull-request'
import { isAct } from '../config.js'
import useCheckVersion from '../hooks/useCheckVersion.js'
import { validateMeta } from '../types.js'
import { createLoggerNs, escapeHtml } from '../utils.js'

/**
 * 检查单个 app 或者检查全部应用
 */
export default async function checkVersion() {
  try {
    const logger = createLoggerNs()

    const apps = await getApps()
    if (!apps.length) {
      logger.warning('No apps found, please check your directory')
      core.setOutput('status', 'success')
      return
    }

    logger.info(`[${apps.length}]Checking for updates...`)

    const summary = new Map<string, CheckResult>()
    const typeSet = new Map<string, number>()
    for await (const app of apps) {
      const startTime = performance.now()
      const result = await useCheckVersion(app)
      const duration = (performance.now() - startTime).toFixed(2)
      summary.set(app.dockerMeta.context, { ...result, duration })
      typeSet.set(app.type, (typeSet.get(app.type) || 0) + 1)
    }

    // 输出统计信息
    const totalApps = summary.size
    const results = Array.from(summary.values())
    const updatedApps = results.filter(r => r.hasUpdate)
    const errorApps = results.filter(r => r.status === 'error').length

    logger.info([
      `\nTotal ${green(totalApps)} apps checked`,
      `${cyan(updatedApps?.length)} updates`,
      `${errorApps ? red(errorApps) : green(0)} errors`,
    ].join(', '))

    logger.info(
      `App types: ${Array.from(typeSet.entries()).map(([type, count]) => `${type}(${count})`).join(', ')}`,
    )

    // 如果有更新，处理 PR 创建逻辑
    if (updatedApps?.length) {
      await handlePullRequestCreation(updatedApps, summary)
    }

    core.setOutput('status', 'success')
    core.setOutput('updates_count', updatedApps.toString())
    core.setOutput('has_updates', updatedApps?.length ? 'true' : 'false')
  }
  catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
    else {
      core.setFailed('An unexpected error occurred')
    }
  }
}

/**
 * 获取所有待处理的应用 Meta 信息
 *
 * - apps/*\/meta.json
 * - base/*\/meta.json
 * - sync/*\/meta.json
 */
export async function getApps(): Promise<Meta[]> {
  const logger = createLoggerNs('GetApps')

  const metaFiles = await fg.glob([
    'apps/*/meta.json',
    'base/*/meta.json',
    'sync/*/meta.json',
  ])

  await logger.debugGroup(
    `Meta Files(${metaFiles.length})`,
    async () => core.info(JSON.stringify(metaFiles, null, 2)),
  )

  const allMetaSet = new Map()
  for await (const metaFile of metaFiles) {
    const context = path.dirname(metaFile)

    try {
      const meta = await fsa.readJSON(metaFile, 'utf-8') as Meta

      const docker = meta?.dockerMeta || {}
      const dockerfile = path.join(context, docker?.dockerfile || 'Dockerfile')

      let reason: string | undefined
      if (!docker?.dockerfile) {
        reason = 'No Dockerfile specified'
      }
      else if (!fs.existsSync(dockerfile)) {
        reason = `Dockerfile not found: ${dockerfile}`
      }
      else if (meta.skip) {
        reason = 'Meta marked as skipped'
      }
      else if (!validateMeta(meta)) {
        reason = 'Invalid meta format'
      }

      if (!reason) {
        // 设置默认值
        docker.context = docker.context || context
        docker.dockerfile = docker.dockerfile || 'Dockerfile'
        docker.push = docker.push ?? true
      }

      allMetaSet.set(context, { context, meta, reason })
    }
    catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      allMetaSet.set(context, {
        context,
        meta: {} as Meta,
        reason: `Failed to read meta.json: ${errorMsg}`,
      })
    }
  }

  const allMetaItems = Array.from(allMetaSet.values())
  const validMetaItems = allMetaItems.filter(item => !item.reason)
  const validMetas = validMetaItems.map(item => item.meta)

  await logger.group(
    `Meta Files Resolved(${metaFiles.length})`,
    async () => {
      const summary = allMetaItems.map((item: any) => {
        const { context, meta, reason } = item
        return `${reason ? '❌' : '✅'} ${cyan(meta.name)} (${context})${reason ? ` ${yellow(reason)}` : ''}`
      },
      ).join('\n')
      core.info(summary || 'No valid meta files found')
    },
  )

  if (!validMetaItems.length) {
    logger.warning('No valid meta files found, please check your directory')
    return []
  }

  // 事件处理逻辑
  const ghContext = gh.context
  const event = ghContext.eventName

  const resolveContext = (context: string): Meta | false => {
    const metaItem = allMetaSet.get(context)

    if (!metaItem) {
      core.setFailed(`Invalid context: ${red(context)}, available: ${Array.from(allMetaSet.keys()).join(', ')}`)
      return false
    }

    if (metaItem.reason) {
      core.setFailed(`Invalid meta for ${red(context)}: ${metaItem.reason}`)
      return false
    }
    return metaItem.meta
  }

  // workflow_dispatch 事件
  if (event === 'workflow_dispatch') {
    const context = core.getInput('context')
    logger.info(`Workflow dispatch context: ${cyan(context)}`)

    // `all` is a special case to return all valid meta
    if (!context || context === 'all') {
      logger.debug(`Processing all apps (${validMetas.length} found)`)
      return validMetas
    }

    const resolved = resolveContext(context)
    if (resolved) {
      logger.debug(`Processing context: ${cyan(context)} (${resolved.name})`)
      return [resolved]
    }
    return []
  }

  // push 事件
  if (event === 'push') {
    const ghMessage = ghContext.payload?.head_commit?.message || ''
    logger.debug(`Push commit message: ${cyan(escapeHtml(ghMessage))}`)

    if (ghMessage.includes('force check')) {
      // 优先从修改的文件获取
      const changedFiles = ghContext.payload?.commits?.[0]?.modified || []
      logger.debug(`Changed files: ${changedFiles.join(', ')}`)
      const modifiedMetas = changedFiles
        .filter((file: string) => file.match(/^(apps|base|sync)\/[^/]+\/meta\.json$/))
        .map((file: string) => resolveContext(path.dirname(file)))
        .filter(Boolean)

      if (modifiedMetas?.length > 0) {
        logger.debug(`Processing modified files: ${modifiedMetas.map((m: any) => m.name).join(', ')}`)
        return modifiedMetas
      }

      logger.debug(`No modified meta files found in commit, falling back to context`)
      // 回退到 commit message
      const contextMatch = ghMessage.match(/\w+\(([^)]+)\):/)
      if (contextMatch) {
        const context = contextMatch[1]
        const resolved = resolveContext(context)
        if (resolved) {
          logger.debug(`Processing context from commit: ${cyan(context)}`)
          return [resolved]
        }
      }
      else {
        logger.warning(`No valid context found in commit message: ${ghMessage}`)
      }
    }
  }

  // 默认返回所有有效的 meta
  logger.debug(`Processing all apps (${validMetas.length} valid metas found)`)
  return validMetas
}

async function handlePullRequestCreation(checkResults: CheckResult[], summary: Map<string, CheckResult>) {
  const enableCreatePr = core.getBooleanInput('create_pr')

  if (!enableCreatePr) {
    core.warning(yellow('Skipping PR creation'))
    return
  }

  if (isAct) {
    core.info(yellow('Skipping PR creation in ACT environment'))
    return
  }

  let currentContext = ''

  try {
    // 实现 PR 创建逻辑
    core.info(`Creating PRs for ${checkResults.length} updates...`)

    const token = core.getInput('token', { required: true })
    const octokit = gh.getOctokit(token, {}, createPullRequest as any)
    // @ts-expect-error ignore
    const createPR = octokit?.createPullRequest as ReturnType<typeof createPullRequest>['createPullRequest']

    for await (const checkResult of checkResults) {
      const result = await createPR?.(checkResult.pr!.data)

      currentContext = checkResult.meta.dockerMeta.context
      const data = summary.get(currentContext)!
      data.pr!.html_url = result?.data.html_url
      summary.set(currentContext, data)
    }

    return summary
  }
  catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'

    const data = summary.get(currentContext)!
    data.pr!.error = errorMsg
    summary.set(currentContext, data)

    core.setFailed(`Failed to create PR for ${currentContext}: ${errorMsg}`)
    return summary
  }
}

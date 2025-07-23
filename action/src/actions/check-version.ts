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
  const logger = createLoggerNs()

  try {
    logger.info('🚀 Starting version check process...')

    const apps = await getApps()
    if (!apps.length) {
      logger.warning('No apps found, please check your directory')
      core.setOutput('status', 'success')
      core.setOutput('updates_count', '0')
      core.setOutput('has_updates', 'false')
      return
    }

    logger.info(`📋 Found ${green(apps.length.toString())} apps to check`)

    // 打印应用列表
    await logger.debugGroup('Apps to check', async () => {
      const appList = apps.map(app => `${app.type.toUpperCase()}: ${app.name} (${app.dockerMeta.context})`).join('\n')
      core.info(appList)
    })

    const summary = new Map<string, CheckResult>()
    const typeSet = new Map<string, number>()

    let processedCount = 0
    for await (const app of apps) {
      processedCount++
      logger.info(`⏳ [${processedCount}/${apps.length}] Checking ${cyan(app.name)}...`)

      const startTime = performance.now()
      const result = await useCheckVersion(app)
      const duration = (performance.now() - startTime).toFixed(2)

      const resultWithDuration = { ...result, duration }
      summary.set(app.dockerMeta.context, resultWithDuration)
      typeSet.set(app.type, (typeSet.get(app.type) || 0) + 1)

      // 输出单个检查结果
      if (result.hasUpdate) {
        logger.info(`✅ ${green(app.name)}: Update available (${duration}ms)`)
      }
      else if (result.status === 'error') {
        logger.error(`❌ ${red(app.name)}: Check failed - ${result.error} (${duration}ms)`)
      }
      else {
        logger.info(`✓ ${app.name}: Up to date (${duration}ms)`)
      }
    }

    // 输出统计信息
    const totalApps = summary.size
    const results = Array.from(summary.values())
    const updatedApps = results.filter(r => r.hasUpdate)
    const errorApps = results.filter(r => r.status === 'error')
    const upToDateApps = results.filter(r => !r.hasUpdate && r.status === 'success')

    logger.info('')
    logger.info('📊 Check Summary:')
    logger.info([
      `Total: ${green(totalApps.toString())} apps checked`,
      `Updates: ${updatedApps.length ? cyan(updatedApps.length.toString()) : green('0')}`,
      `Errors: ${errorApps.length ? red(errorApps.length.toString()) : green('0')}`,
      `Up to date: ${green(upToDateApps.length.toString())}`,
    ].join(' | '))

    // 输出应用类型统计
    const typeStats = Array.from(typeSet.entries())
      .map(([type, count]) => `${type}(${count})`)
      .join(', ')
    logger.info(`App types: ${typeStats}`)

    // 详细错误信息
    if (errorApps.length > 0) {
      await logger.group('❌ Error Details', async () => {
        errorApps.forEach((app) => {
          core.info(`${red('•')} ${app.meta.name}: ${app.error}`)
        })
      })
    }

    // 详细更新信息
    if (updatedApps.length > 0) {
      await logger.group('🔄 Available Updates', async () => {
        updatedApps.forEach((app) => {
          const meta = app.meta
          core.info(`${green('•')} ${meta.name}: ${meta.version} (${meta.dockerMeta.context})`)
        })
      })

      // 处理 PR 创建
      await handlePullRequestCreation(updatedApps, summary)
    }

    // 设置输出
    core.setOutput('status', 'success')
    core.setOutput('updates_count', updatedApps.length.toString())
    core.setOutput('has_updates', updatedApps.length > 0 ? 'true' : 'false')
    core.setOutput('error_count', errorApps.length.toString())

    logger.info(`✨ Version check completed successfully!`)
  }
  catch (error) {
    logger.error('💥 Version check failed:')

    if (error instanceof Error) {
      logger.error(`Error: ${error.message}`)
      if (error.stack) {
        await logger.debugGroup('Stack trace', async () => core.info(error.stack!))
      }
      core.setFailed(error.message)
    }
    else {
      const unknownError = 'An unexpected error occurred'
      logger.error(unknownError)
      core.setFailed(unknownError)
    }

    // 设置错误状态输出
    core.setOutput('status', 'error')
    core.setOutput('updates_count', '0')
    core.setOutput('has_updates', 'false')
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

  logger.debug('🔍 Searching for meta files...')
  const metaFiles = await fg.glob(['**/*/meta.json'])
  logger.debug(`Found ${metaFiles.length} meta files`)
  await logger.debugGroupJson(`Meta Files(${metaFiles.length})`, metaFiles)

  if (metaFiles.length === 0) {
    logger.warning('No meta.json files found in apps/, base/, or sync/ directories')
    return []
  }

  const allMetaSet = new Map()
  let validCount = 0
  let invalidCount = 0

  for await (const metaFile of metaFiles) {
    const context = path.dirname(metaFile)
    logger.debug(`Processing ${metaFile}...`)

    try {
      const meta = await fsa.readJSON(metaFile, 'utf-8') as Meta

      const docker = meta?.dockerMeta || {}
      const dockerfile = path.join(context, docker?.dockerfile || 'Dockerfile')

      let reason: string | undefined

      // 验证检查
      if (!meta) {
        reason = 'Failed to parse meta.json'
      }
      else if (!docker?.dockerfile) {
        reason = 'No Dockerfile specified in dockerMeta'
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
      else if (!meta.name || !meta.name.trim()) {
        reason = 'Meta name is required'
      }
      else if (!meta.type || !['app', 'base', 'sync'].includes(meta.type)) {
        reason = `Invalid meta type: ${meta.type}`
      }

      if (!reason) {
        // 设置默认值
        docker.context = docker.context || context
        docker.dockerfile = docker.dockerfile || 'Dockerfile'
        docker.push = docker.push ?? true
        validCount++
        logger.debug(`✅ ${meta.name} validated successfully`)
      }
      else {
        invalidCount++
        logger.debug(`❌ ${context}: ${reason}`)
      }

      allMetaSet.set(context, { context, meta, reason })
    }
    catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      invalidCount++
      logger.error(`Failed to process ${metaFile}: ${errorMsg}`)

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

  logger.info(`📋 Meta validation: ${green(validCount.toString())} valid, ${invalidCount > 0 ? red(invalidCount.toString()) : green('0')} invalid`)

  await logger.group(
    `Meta Files Resolved(${metaFiles.length})`,
    async () => {
      const summary = allMetaItems.map((item: any) => {
        const { context, meta, reason } = item
        const statusIcon = reason ? '❌' : '✅'
        const nameDisplay = meta?.name || 'unknown'
        const reasonDisplay = reason ? ` ${yellow(`(${reason})`)}` : ''
        return `${statusIcon} ${cyan(nameDisplay)} (${context})${reasonDisplay}`
      },
      ).join('\n')
      core.info(summary || 'No valid meta files found')
    },
  )

  if (!validMetaItems.length) {
    logger.warning('No valid meta files found, please check your directory and meta.json format')
    return []
  }

  // 事件处理逻辑
  const ghContext = gh.context
  const event = ghContext.eventName

  logger.debug(`Processing event: ${cyan(event)}`)

  const resolveContext = (context: string): Meta | false => {
    const metaItem = allMetaSet.get(context)

    if (!metaItem) {
      const availableContexts = Array.from(allMetaSet.keys()).join(', ')
      logger.error(`Invalid context: ${red(context)}, available: ${availableContexts}`)
      return false
    }

    if (metaItem.reason) {
      logger.error(`Invalid meta for ${red(context)}: ${metaItem.reason}`)
      return false
    }

    return metaItem.meta
  }

  // workflow_dispatch 事件
  if (event === 'workflow_dispatch') {
    const context = core.getInput('context')
    logger.info(`Workflow dispatch with context: ${cyan(context || 'all')}`)

    // `all` is a special case to return all valid meta
    if (!context || context === 'all') {
      logger.debug(`Processing all apps (${validMetas.length} found)`)
      return validMetas
    }

    const resolved = resolveContext(context)
    if (resolved) {
      logger.debug(`Processing specific context: ${cyan(context)} (${resolved.name})`)
      return [resolved]
    }
    return []
  }

  // push 事件
  if (event === 'push') {
    const ghMessage = ghContext.payload?.head_commit?.message || ''
    logger.debug(`Push event with commit message: ${cyan(escapeHtml(ghMessage))}`)

    if (ghMessage.includes('force check')) {
      logger.info('🔄 Force check detected in commit message')

      // 优先从修改的文件获取
      const changedFiles = ghContext.payload?.commits?.[0]?.modified || []
      logger.debug(`Changed files: ${changedFiles.join(', ')}`)

      const modifiedMetas = changedFiles
        .filter((file: string) => file.match(/\/meta\.json$/))
        .map((file: string) => resolveContext(path.dirname(file)))
        .filter(Boolean)

      if (modifiedMetas?.length > 0) {
        const modifiedNames = modifiedMetas.map((m: any) => m.name).join(', ')
        logger.debug(`Processing modified meta files: ${modifiedNames}`)
        return modifiedMetas
      }

      logger.debug(`No modified meta files found in commit, trying to extract context from message`)

      // 回退到 commit message
      const contextMatch = ghMessage.match(/\w+\(([^)]+)\):/)
      if (contextMatch) {
        const context = contextMatch[1]
        const resolved = resolveContext(context)
        if (resolved) {
          logger.debug(`Processing context from commit message: ${cyan(context)}`)
          return [resolved]
        }
      }
      else {
        logger.warning(`No valid context pattern found in commit message: ${ghMessage}`)
        logger.info('Expected format: type(context): message, e.g., chore(apps/app-name): update')
      }
    }
  }

  // 默认返回所有有效的 meta
  logger.debug(`No specific context found, processing all valid metas (${validMetas.length} found)`)
  return validMetas
}

async function handlePullRequestCreation(checkResults: CheckResult[], summary: Map<string, CheckResult>) {
  const logger = createLoggerNs('CreatePR')
  const enableCreatePr = core.getBooleanInput('create_pr')

  if (!enableCreatePr) {
    logger.warning('🚫 PR creation disabled by input parameter')
    return
  }

  if (isAct) {
    logger.info('🎭 Running in ACT environment, skipping PR creation')
    return
  }

  logger.info(`🔄 Creating PRs for ${checkResults.length} updates...`)

  let currentContext = ''
  let successCount = 0
  let failureCount = 0

  try {
    const token = core.getInput('token', { required: true })
    if (!token) {
      throw new Error('GitHub token is required for PR creation')
    }

    const octokit = gh.getOctokit(token, {}, createPullRequest as any)
    // @ts-expect-error ignore
    const createPR = octokit?.createPullRequest as ReturnType<typeof createPullRequest>['createPullRequest']

    if (!createPR) {
      throw new Error('Failed to initialize createPullRequest function')
    }

    for await (const checkResult of checkResults) {
      currentContext = checkResult.meta.dockerMeta.context

      try {
        logger.info(`📝 Creating PR for ${cyan(checkResult.meta.name)}...`)

        // 验证 PR 数据
        if (!checkResult.pr?.data) {
          throw new Error(`Missing PR data for ${checkResult.meta.name}`)
        }

        const result = await createPR(checkResult.pr.data)

        const data = summary.get(currentContext)!
        if (!data.pr) {
          data.pr = { data: checkResult.pr.data }
        }
        data.pr.html_url = result?.data.html_url
        summary.set(currentContext, data)

        successCount++
        logger.info(`✅ PR created for ${green(checkResult.meta.name)}: ${result?.data.html_url}`)
      }
      catch (prError) {
        const errorMsg = prError instanceof Error ? prError.message : 'Unknown PR creation error'
        failureCount++

        logger.error(`❌ Failed to create PR for ${red(checkResult.meta.name)}: ${errorMsg}`)

        const data = summary.get(currentContext)!
        if (!data.pr) {
          data.pr = { data: checkResult.pr!.data }
        }
        data.pr.error = errorMsg
        summary.set(currentContext, data)
      }
    }

    logger.info(`📊 PR creation summary: ${green(successCount.toString())} successful, ${failureCount > 0 ? red(failureCount.toString()) : green('0')} failed`)

    return summary
  }
  catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    failureCount++

    logger.error(`💥 PR creation process failed: ${errorMsg}`)

    if (currentContext && summary.has(currentContext)) {
      const data = summary.get(currentContext)!
      if (!data.pr) {
        // eslint-disable-next-line ts/no-non-null-asserted-optional-chain
        data.pr = { data: checkResults.find(r => r.meta.dockerMeta.context === currentContext)?.pr?.data! }
      }
      data.pr.error = errorMsg
      summary.set(currentContext, data)
    }

    core.setFailed(`Failed to create PR for ${currentContext}: ${errorMsg}`)
    return summary
  }
}

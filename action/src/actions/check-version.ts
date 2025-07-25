import type { CheckResult, JobSummaryOptions, Meta, MetaDetail } from '../types.js'
import fs from 'node:fs'
import path from 'node:path'
import * as core from '@actions/core'
import * as gh from '@actions/github'
import fg from 'fast-glob'
import fsa from 'fs-extra'
import { cyan, green, red, yellow } from 'kolorist'
import { createPullRequest } from 'octokit-plugin-create-pull-request'
import { getCurrentBranch, isAct } from '../config.js'
import useCheckVersion from '../hooks/useCheckVersion.js'
import { validateMeta } from '../types.js'
import { createLoggerNs, escapeHtml, formatDate, formatDuration } from '../utils.js'

/**
 * 检查单个 app 或者检查全部应用
 */
export default async function checkVersion() {
  const logger = createLoggerNs()
  const actualStartTime = Date.now()

  try {
    logger.debug('Starting version check process...')

    const { metas: apps, allMetaDetails } = await getApps()

    if (!apps.length) {
      logger.info(yellow('No apps found, please check your directory'))
      core.setOutput('status', 'success')
      core.setOutput('updates_count', '0')

      await generateJobSummary({ actualStartTime, allMetaDetails })
      return
    }

    const startTime = Date.now()
    const summary = new Map<string, CheckResult>()
    const typeStats: Record<string, number> = {}

    logger.info('')

    let processedCount = 0
    for await (const app of apps) {
      processedCount++
      logger.debug(`⏳ [${processedCount}/${apps.length}] Checking ${cyan(app.dockerMeta.context)}...`)
      const result = await useCheckVersion(app)
      summary.set(app.dockerMeta.context, result)
      typeStats[app.type] = (typeStats[app.type] || 0) + 1
    }

    const totalDuration = Date.now() - startTime

    // 输出统计信息
    const totalApps = summary.size
    const results = Array.from(summary.values())
    const updatedApps = results.filter(r => r.hasUpdate)
    const errorApps = results.filter(r => r.status === 'error')
    const upToDateApps = results.filter(r => !r.hasUpdate && r.status === 'success')

    logger.info([
      `\nTotal: ${green(totalApps.toString())} apps checked`,
      `Updates: ${updatedApps.length ? cyan(updatedApps.length.toString()) : green('0')}`,
      `Errors: ${errorApps.length ? red(errorApps.length.toString()) : green('0')}`,
      `Up to date: ${green(upToDateApps.length.toString())}`,
      `Duration: ${cyan(formatDuration(Number(totalDuration)))}`,
    ].join(' | '))

    // 输出应用类型统计
    logger.debug(`App types: ${Object.entries(typeStats).map(([type, count]) => `${type}(${count})`).join(' · ')}`)

    // 详细错误信息
    if (errorApps.length > 0) {
      await logger.group('Error Details', async () => {
        errorApps.forEach((app) => {
          const meta = app.meta
          core.info(`${red('•')} ${meta.dockerMeta.context}: ${app.error}`)
        })
      })
    }

    // 详细更新信息
    if (updatedApps.length > 0) {
      await logger.debugGroup('Available Updates', async () => {
        updatedApps.forEach((app) => {
          const meta = app.meta
          core.info(`${green('•')} ${meta.dockerMeta.context}: ${meta.version}`)
        })
      })

      // 处理 PR 创建
      await handlePullRequestCreation(updatedApps, summary)
    }

    // 生成 GitHub Actions Summary
    await generateJobSummary({ summary, totalDuration, typeStats, actualStartTime, allMetaDetails })

    // 设置输出
    core.setOutput('status', 'success')
    core.setOutput('updates_count', updatedApps.length.toString())
    core.setOutput('error_count', errorApps.length.toString())

    logger.debug(`Version check completed successfully!`)
  }
  catch (error) {
    logger.error('Version check failed:')

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
  }
}

/**
 * 获取所有待处理的应用 Meta 信息
 *
 * - apps/*\/meta.json
 * - base/*\/meta.json
 * - sync/*\/meta.json
 */
export async function getApps(): Promise<{ metas: Meta[], allMetaDetails: Array<MetaDetail> }> {
  const logger = createLoggerNs()

  const metaFiles = await fg.glob([
    'apps/**/*/meta.json',
    'base/**/*/meta.json',
    'sync/**/*/meta.json',
    'test/**/*/meta.json',
  ])
  await logger.debugGroupJson(`Meta Files(${metaFiles.length})`, metaFiles)

  if (metaFiles.length === 0) {
    logger.warning('No meta.json files found in apps/, base/, or sync/ directories')
    return { metas: [], allMetaDetails: [] }
  }

  const allMetaSet = new Map<string, MetaDetail>()

  for await (const metaFile of metaFiles) {
    const context = path.dirname(metaFile)

    try {
      const meta = await fsa.readJSON(metaFile, 'utf-8') as Meta

      const docker = meta?.dockerMeta || {}
      const dockerfile = path.join(context, docker?.dockerfile || 'Dockerfile')

      let reason: string | undefined

      // 验证检查
      if (!docker?.dockerfile) {
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
  const invalidCount = allMetaItems.length - validMetaItems.length

  logger.debug(`Meta validation: ${green(validMetaItems.length)} valid, ${invalidCount ? red(invalidCount) : green('0')} invalid`)

  await logger.group(
    `Meta Files Resolved(${allMetaItems.length})`,
    async () => {
      const summary = allMetaItems.map((item: any) => {
        const { context, meta, reason } = item
        const statusIcon = reason ? '❌' : '✅'
        const nameDisplay = meta?.name || 'unknown'
        const reasonDisplay = reason ? ` ${yellow(` ${reason}`)}` : ''
        return `${statusIcon} ${cyan(nameDisplay)} (${context})${reasonDisplay}`
      },
      ).join('\n')
      core.info(summary || 'No valid meta files found')
    },
  )

  if (!validMetaItems.length) {
    return { metas: [], allMetaDetails: allMetaItems }
  }

  // 事件处理逻辑
  const ghContext = gh.context
  const event = ghContext.eventName

  logger.debug(`Processing event: ${cyan(event)}`)

  const resolveContext = (context: string): Meta | false => {
    const metaItem = allMetaSet.get(context)

    if (!metaItem) {
      const availableContexts = Array.from(allMetaSet.keys()).join(', ')
      logger.warning(`Invalid context: ${red(context)}, available: ${availableContexts}`)
      return false
    }

    if (metaItem.reason) {
      logger.warning(`Invalid meta for ${red(context)}: ${metaItem.reason}`)
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
      return { metas: validMetas, allMetaDetails: allMetaItems }
    }

    const resolved = resolveContext(context)
    if (resolved) {
      logger.debug(`Processing specific context: ${cyan(context)} (${resolved.name})`)
      return { metas: [resolved], allMetaDetails: allMetaItems }
    }
    return { metas: [], allMetaDetails: allMetaItems }
  }

  // push 事件
  if (event === 'push') {
    const ghMessage = ghContext.payload?.head_commit?.message || ''
    logger.debug(`Push event with commit message: ${cyan(escapeHtml(ghMessage))}`)

    if (ghMessage.includes('force check')) {
      logger.info('Force check detected in commit message')

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
        return { metas: modifiedMetas, allMetaDetails: allMetaItems }
      }

      logger.debug(`No modified meta files found in commit, trying to extract context from message`)

      // 回退到 commit message
      const contextMatch = ghMessage.match(/\w+\(([^)]+)\):/)
      if (contextMatch) {
        const context = contextMatch[1]
        const resolved = resolveContext(context)
        if (resolved) {
          logger.debug(`Processing context from commit message: ${cyan(context)}`)
          return { metas: [resolved], allMetaDetails: allMetaItems }
        }
      }
      else {
        logger.info(`No valid context pattern found in commit message: ${ghMessage}`)
        logger.info('Expected format: type(context): message, e.g., chore(apps/app-name): update')
      }
    }
  }

  // 默认返回所有有效的 meta
  logger.debug(`No specific context found, processing all valid metas (${validMetas.length} found)`)
  return { metas: validMetas, allMetaDetails: allMetaItems }
}

async function handlePullRequestCreation(checkResults: CheckResult[], summary: Map<string, CheckResult>) {
  const logger = createLoggerNs('CreatePR')
  const enableCreatePr = core.getBooleanInput('create_pr')

  if (!enableCreatePr) {
    logger.warning('PR creation disabled by input parameter')
    return
  }

  if (isAct) {
    logger.warning('Running in ACT environment, skipping PR creation')
    return
  }

  logger.debug(`Creating PRs for ${checkResults.length} updates...`)

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

    logger.info(`PR creation summary: ${green(successCount.toString())} successful, ${failureCount > 0 ? red(failureCount.toString()) : green('0')} failed`)

    return summary
  }
  catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    failureCount++

    logger.error(`PR creation process failed: ${errorMsg}`)

    if (currentContext && summary.has(currentContext)) {
      const data = summary.get(currentContext)!
      if (!data.pr) {
        // eslint-disable-next-line ts/no-non-null-asserted-optional-chain
        data.pr = { data: checkResults.find(r => r.meta.dockerMeta.context === currentContext)?.pr?.data! }
      }
      data.pr.error = errorMsg
      summary.set(currentContext, data)
    }

    return summary
  }
}

/**
 * 生成 GitHub Actions Job Summary
 */
async function generateJobSummary(options: JobSummaryOptions) {
  const {
    summary = new Map() as NonNullable<JobSummaryOptions['summary']>,
    totalDuration = 0,
    typeStats = {},
    actualStartTime,
    allMetaDetails,
  } = options

  const logger = createLoggerNs('Summary')

  // 从 summary 中提取所有必要的统计信息
  const results = Array.from(summary.values())
  const totalApps = results.length
  // Per app status
  /** 可更新应用 */
  const updatedApps: CheckResult[] = []
  /** 错误应用 */
  const errorApps: CheckResult[] = []
  /** 已是最新版本应用 */
  const upToDateApps: CheckResult[] = []
  /** 跳过的应用 */
  const skippedApps: CheckResult[] = []

  results.forEach((result) => {
    if (result.status === 'error') {
      errorApps.push(result)
    }
    else if (result.status === 'success') {
      result.hasUpdate ? updatedApps.push(result) : upToDateApps.push(result)
    }
    else if (result.status === 'skipped') {
      skippedApps.push(result)
    }
  })

  const ghContext = gh.context
  const repoUrl = `https://github.com/${ghContext.repo.owner}/${ghContext.repo.repo}`

  // 获取当前分支
  const currentBranch = getCurrentBranch()
  const appTypeStats = Object.entries(typeStats).map(([type, count]) => `${type}(${count})`).join(' · ')

  // 计算实际运行时间 - 使用实际开始时间
  const actualRunningTime = actualStartTime ? formatDate(new Date(actualStartTime)) : formatDate()

  // 格式化执行时间
  const formattedDuration = formatDuration(Number(totalDuration))

  let md = `# 版本检查总结`

  // 概览表格 - 添加更多有用信息
  md += `\n\n## 📊 概览\n\n`
  md += '| 总应用数 | 可更新 | 错误数 | 跳过检查 | 最新版本 | 执行时间 | 运行时间 | 应用类型分布 |\n'
  md += '|:---------|:-------|:-------|:-------|:---------|:---------|:------------|:------------|\n'
  md += `| ${totalApps} | ${updatedApps.length} | ${errorApps.length} | ${skippedApps.length} | ${upToDateApps.length} | ${formattedDuration} | ${actualRunningTime} | ${appTypeStats} |`

  // 添加扫描统计信息
  const totalMetaFilesCount = allMetaDetails?.length
  const invalidMetaFiles = allMetaDetails?.filter(item => item.reason)

  if (totalMetaFilesCount) {
    md += `\n\n### 📋 扫描统计\n\n`
    md += '| 扫描文件数 | 有效配置 | 无效配置 | 有效率 |\n'
    md += '|:-----------|:---------|:---------|:-------|\n'
    const validRate = totalApps > 0 ? ((totalApps / totalMetaFilesCount) * 100).toFixed(1) : '0.0'
    md += `| ${totalMetaFilesCount} | ${totalApps} | ${invalidMetaFiles?.length} | ${validRate}% |`

    // 如果有无效文件，显示详细信息
    if (invalidMetaFiles?.length) {
      md += `\n\n#### ⚠️ 无效配置详情\n\n`
      md += '| 路径 | 应用名称 | 无效原因 |\n'
      md += '|:-----|:---------|:---------|\n'
      invalidMetaFiles.forEach((item) => {
        md += `| \`${item.context}\` | ${item.meta?.name || 'N/A'} | ${item.reason || '未知错误'} |\n`
      })
    }
  }

  // 如果没有应用，显示提示信息和统计
  if (!totalApps) {
    md += `\n\n## ℹ️ 详细信息\n\n`

    if (totalMetaFilesCount) {
      md += `发现 **${totalMetaFilesCount}** 个 meta.json 文件，但其中 **${invalidMetaFiles?.length || 'N/A'}** 个文件无效。\n\n`
    }

    md += `请检查以下目录中是否存在有效的 \`meta.json\` 文件：\n\n`
    md += `- \`apps/*/meta.json\`\n`
    md += `- \`base/*/meta.json\`\n`
    md += `- \`sync/*/meta.json\`\n`
    md += `- \`test/*/meta.json\`\n`

    md += `\n---\n\n*生成时间: ${actualRunningTime} | 版本检查工作流 v2.0*`

    await core.summary.addRaw(md).write()
    logger.debug('GitHub Actions Summary 已生成 (空结果)')
    return
  }

  // 合并所有应用并按类型分组
  const allApps = [...updatedApps, ...errorApps, ...upToDateApps, ...skippedApps]
  const appsByType = groupAppsByType(allApps)

  // 类型映射和图标
  const typeMap = {
    app: { name: '应用程序', icon: '🚀' },
    base: { name: '基础镜像', icon: '🏗️' },
    sync: { name: '同步镜像', icon: '🔄' },
  }

  // 按类型生成表格
  const appTypes = ['app', 'base', 'sync'] as const
  for (const type of appTypes) {
    const appsOfType = appsByType.get(type)
    if (!appsOfType || appsOfType.length === 0)
      continue

    const typeInfo = typeMap[type]
    const typeCount = appsOfType.length
    const errorCount = appsOfType.filter(app => app.status === 'error').length
    const updateCount = appsOfType.filter(app => app.hasUpdate && app.status === 'success').length
    const upToDateCount = appsOfType.filter(app => !app.hasUpdate && app.status === 'success').length
    const skippedCount = appsOfType.filter(app => app.status === 'skipped').length

    md += `\n\n## ${typeInfo.icon} ${typeInfo.name} (${typeCount})`

    // 添加类型统计
    const statusParts = []
    if (errorCount > 0)
      statusParts.push(`❌ 错误: ${errorCount}`)
    if (updateCount > 0)
      statusParts.push(`🔄 可更新: ${updateCount}`)
    if (upToDateCount > 0)
      statusParts.push(`✅ 最新: ${upToDateCount}`)
    if (skippedCount > 0)
      statusParts.push(`⏭️ 跳过: ${skippedCount}`)

    if (statusParts.length > 0) {
      md += ` - ${statusParts.join(' | ')}`
    }
    md += '\n\n'

    // 表格标题
    md += '| 应用名称 | 状态 | 版本信息 | 仓库地址 | 镜像地址 | 文件链接 | 执行时间 | PR状态 |\n'
    md += '|:--------|:-----|:---------|:---------|:---------|:---------|:---------|:-------|\n'

    // 排序：错误 → 可更新 → 已是最新版本
    const sortedApps = sortAppsByStatus(appsOfType)

    const enableCreatePr = core.getBooleanInput('create_pr')
    sortedApps.forEach((app) => {
      const { meta, oldMeta, pr, duration: appDuration, error, hasUpdate, status } = app
      const context = meta.dockerMeta.context

      // 生成状态图标和信息
      const statusInfo = generateStatusInfo(app, error)

      // 生成版本信息
      const versionInfo = generateVersionInfo(app, oldMeta, meta, hasUpdate, status)

      // 生成文件链接
      const fileLinks = generateFileLinks(context, meta, repoUrl, currentBranch)

      // 生成仓库链接
      const repoLink = meta.repo ? `[${meta.name}](${meta.repo})` : meta.name

      // 生成镜像地址链接
      const imageLinks = generateImageLinks(meta)

      // 生成 PR 状态
      const prStatus = generatePRStatus(pr, enableCreatePr, hasUpdate, status)

      // 格式化应用执行时间
      const formattedAppDuration = formatDuration(appDuration || 0)

      md += `| **${context}** | ${statusInfo} | ${versionInfo} | ${repoLink} | ${imageLinks} | ${fileLinks} | ${formattedAppDuration} | ${prStatus} |\n`
    })
  }

  md += `\n---\n\n*生成时间: ${formatDate()} | 版本检查工作流 v2.0*`

  await core.summary.addRaw(md).write()
  logger.debug('GitHub Actions Summary 已生成 (重新设计版本)')
}

/**
 * 按应用类型分组
 */
function groupAppsByType(apps: CheckResult[]): Map<string, CheckResult[]> {
  const grouped = new Map<string, CheckResult[]>()

  apps.forEach((app) => {
    const type = app.meta.type
    if (!grouped.has(type)) {
      grouped.set(type, [])
    }
    grouped.get(type)!.push(app)
  })

  return grouped
}

/**
 * 按状态排序应用：错误 → 可更新 → 跳过 → 已是最新版本
 */
function sortAppsByStatus(apps: CheckResult[]): CheckResult[] {
  return apps.sort((a, b) => {
    // 定义优先级：错误(0) → 可更新(1) → 跳过(2) → 已是最新版本(3)
    const getPriority = (app: CheckResult): number => {
      if (app.status === 'error')
        return 0
      if (app.hasUpdate && app.status === 'success')
        return 1
      if (app.status === 'skipped')
        return 2
      return 3 // 已是最新版本
    }

    const priorityA = getPriority(a)
    const priorityB = getPriority(b)

    if (priorityA !== priorityB) {
      return priorityA - priorityB
    }

    // 同优先级按名称排序
    return a.meta.dockerMeta.context.localeCompare(b.meta.dockerMeta.context)
  })
}

/**
 * 生成状态信息
 */
function generateStatusInfo(app: CheckResult, error?: string): string {
  if (app.status === 'error') {
    const errorMsg = error ? error.substring(0, 50) + (error.length > 50 ? '...' : '') : '未知错误'
    return `❌ 错误<br/><small>${errorMsg}</small>`
  }

  if (app.status === 'skipped') {
    return `⏭️ 跳过检查`
  }

  if (app.hasUpdate && app.status === 'success') {
    return `🔄 **可更新**`
  }

  return `✅ 最新版本`
}

/**
 * 生成版本信息
 */
function generateVersionInfo(app: CheckResult, oldMeta: any, meta: any, hasUpdate: boolean, status: string): string {
  if (status === 'error') {
    return `\`${oldMeta?.version || 'N/A'}\``
  }

  if (status === 'skipped') {
    return `\`${meta?.version || 'N/A'}\` (跳过)`
  }

  if (hasUpdate && status === 'success') {
    const oldVersion = oldMeta?.version || 'N/A'
    const newVersion = meta?.version || 'N/A'
    return `\`${oldVersion}\` → **\`${newVersion}\`**`
  }

  return `\`${meta?.version || 'N/A'}\``
}

/**
 * 生成文件链接
 */
function generateFileLinks(context: string, meta: any, repoUrl: string, currentBranch: string): string {
  const dockerfilePath = `${context}/${meta.dockerMeta?.dockerfile || 'Dockerfile'}`
  const metaPath = `${context}/meta.json`
  const readmePath = `${context}/README.md`

  const dockerfileLink = `[Dockerfile](${repoUrl}/blob/${currentBranch}/${dockerfilePath})`
  const metaLink = `[meta.json](${repoUrl}/blob/${currentBranch}/${metaPath})`
  const readmeLink = `[README](${repoUrl}/blob/${currentBranch}/${readmePath})`

  return `${dockerfileLink} • ${metaLink} • ${readmeLink}`
}

/**
 * 生成镜像地址链接
 */
function generateImageLinks(meta: any): string {
  const imageName = meta.name

  if (!imageName) {
    return 'N/A'
  }

  // Docker Hub 链接
  const dockerHubUrl = `https://hub.docker.com/r/aliuq/${imageName}`
  const dockerHubLink = `[Docker Hub](${dockerHubUrl})`

  // GHCR 链接
  const ghcrUrl = `https://github.com/aliuq/apps-image/pkgs/container/${imageName}`
  const ghcrLink = `[GHCR](${ghcrUrl})`

  return `${dockerHubLink} • ${ghcrLink}`
}

/**
 * 生成 PR 状态
 */
function generatePRStatus(pr: any, enableCreatePr: boolean, hasUpdate: boolean, status: string): string {
  // 跳过检查和错误状态的应用不需要PR
  if (status === 'skipped' || status === 'error') {
    return 'N/A'
  }

  // 只有可更新的应用才会有 PR 相关信息
  if (!hasUpdate || status !== 'success') {
    return 'N/A'
  }

  if (pr?.html_url) {
    return `[✅ 查看PR](${pr.html_url})`
  }

  if (pr?.error) {
    const errorMsg = pr.error.substring(0, 30) + (pr.error.length > 30 ? '...' : '')
    return `❌ ${errorMsg}`
  }

  if (!enableCreatePr) {
    return '⚠️ 已禁用'
  }

  return '⏳ 待创建'
}

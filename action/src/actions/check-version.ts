import type { CheckResult, Meta } from '../types.js'
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
import { createLoggerNs, escapeHtml, formatDate } from '../utils.js'

/**
 * 检查单个 app 或者检查全部应用
 */
export default async function checkVersion() {
  const logger = createLoggerNs()

  try {
    logger.info('Starting version check process...')

    const apps = await getApps()
    if (!apps.length) {
      logger.info(yellow('No apps found, please check your directory'))
      core.setOutput('status', 'success')
      core.setOutput('updates_count', '0')
      core.setOutput('has_updates', 'false')

      // 添加空结果的 summary
      await generateJobSummary({
        totalApps: 0,
        updatedApps: [],
        errorApps: [],
        upToDateApps: [],
        typeStats: new Map(),
        duration: 0,
      })

      return
    }

    const startTime = performance.now()
    const summary = new Map<string, CheckResult>()
    const typeSet = new Map<string, number>()

    let processedCount = 0
    for await (const app of apps) {
      processedCount++
      logger.debug(`⏳ [${processedCount}/${apps.length}] Checking ${cyan(app.dockerMeta.context)}...`)
      const result = await useCheckVersion(app)
      summary.set(app.dockerMeta.context, result)
      typeSet.set(app.type, (typeSet.get(app.type) || 0) + 1)
    }

    const totalDuration = (performance.now() - startTime).toFixed(2)

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
    ].join(' | '))

    // 输出应用类型统计
    const typeStats = Array.from(typeSet.entries()).map(([type, count]) => `${type}(${count})`).join(', ')
    logger.debug(`App types:\n${typeStats}`)

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
    await generateJobSummary({
      totalApps,
      updatedApps,
      errorApps,
      upToDateApps,
      typeStats: typeSet,
      duration: totalDuration,
      summary,
    })

    // 设置输出
    core.setOutput('status', 'success')
    core.setOutput('updates_count', updatedApps.length.toString())
    core.setOutput('has_updates', updatedApps.length > 0 ? 'true' : 'false')
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
    return []
  }

  const allMetaSet = new Map()
  let validCount = 0
  let invalidCount = 0

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

        validCount++
      }
      else {
        invalidCount++
      }

      allMetaSet.set(context, { context, meta, reason })
    }
    catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      invalidCount++

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

  logger.debug(`Meta validation: ${green(validCount)} valid, ${invalidCount ? red(invalidCount) : green('0')} invalid`)

  await logger.group(
    `Meta Files Resolved(${metaFiles.length})`,
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
        logger.info(`No valid context pattern found in commit message: ${ghMessage}`)
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
async function generateJobSummary(data: {
  totalApps: number
  updatedApps: CheckResult[]
  errorApps: CheckResult[]
  upToDateApps: CheckResult[]
  typeStats: Map<string, number>
  duration: string | number
  summary?: Map<string, CheckResult>
}) {
  const { totalApps, updatedApps, errorApps, upToDateApps, typeStats, duration } = data

  const ghContext = gh.context
  const repoUrl = `https://github.com/${ghContext.repo.owner}/${ghContext.repo.repo}`

  // 获取当前分支
  const currentBranch = getCurrentBranch()
  const appTypeStats = Array.from(typeStats.entries()).map(([type, count]) => `${type}(${count})`).join(', ')

  let markdownContent = `# 版本检查总结

## 概览

| 总应用数 | 可更新 | 错误数 | 最新版本 | 执行时间 | 运行时间 | 应用类型分布 |
|---------|--------|--------|----------|----------|----------|-------------|
| ${totalApps} | ${updatedApps.length} | ${errorApps.length} | ${upToDateApps.length} | ${duration}ms | ${formatDate()} | ${appTypeStats} |

`

  // 更新详情
  if (updatedApps.length > 0) {
    markdownContent += `## 可用更新 (${updatedApps.length})

| 应用名称 | 当前版本 | 新版本 | 类型 | 仓库地址 | Dockerfile | meta.json | 文档 | 执行时间 | PR状态 |
|---------|----------|--------|------|----------|------------|-----------|------|----------|--------|
`
    const enableCreatePr = core.getBooleanInput('create_pr')

    updatedApps.forEach((app) => {
      const meta = app.meta // 新版本的 meta
      const oldMeta = app.oldMeta // 原始的 meta
      const context = meta.dockerMeta.context

      // 构建文件链接
      const dockerfilePath = `${context}/${meta.dockerMeta.dockerfile || 'Dockerfile'}`
      const metaPath = `${context}/meta.json`
      const readmePath = `${context}/README.md`

      const repoLink = meta.repo ? `[🔗 仓库](${meta.repo})` : '无'
      const dockerfileLink = `[📄 Dockerfile](${repoUrl}/blob/${currentBranch}/${dockerfilePath})`
      const metaLink = `[⚙️ meta.json](${repoUrl}/blob/${currentBranch}/${metaPath})`
      const readmeLink = `[📖 README](${repoUrl}/blob/${currentBranch}/${readmePath})`

      const prStatus = app.pr?.html_url
        ? `[✅ 查看PR](${app.pr.html_url})`
        : app.pr?.error
          ? `❌ Failed: ${app.pr.error.substring(0, 30)}...`
          : !enableCreatePr
              ? '⚠️ Disabled'
              : 'N/A'

      // 使用 oldMeta 的版本作为当前版本，meta 的版本作为新版本
      const currentVersion = oldMeta?.version ? `\`${oldMeta.version}\`` : '`N/A`'
      const newVersion = `\`${meta.version}\``

      markdownContent += `| **${meta.name}** | ${currentVersion} | ${newVersion} | \`${meta.type}\` | ${repoLink} | ${dockerfileLink} | ${metaLink} | ${readmeLink} | ${app.duration}ms | ${prStatus} |\n`
    })
    markdownContent += '\n'
  }

  // 错误详情
  if (errorApps.length > 0) {
    markdownContent += `## 检查错误 (${errorApps.length})

| 应用名称 | 类型 | 错误信息 | 仓库地址 | Dockerfile | meta.json | 文档 | 执行时间 |
|---------|------|----------|----------|------------|-----------|------|----------|
`
    errorApps.forEach((app) => {
      const meta = app.meta || app.oldMeta || {} // 错误时可能没有 meta，使用 oldMeta
      const context = meta.dockerMeta?.context || 'unknown'

      // 构建文件链接
      const dockerfilePath = `${context}/${meta.dockerMeta?.dockerfile || 'Dockerfile'}`
      const metaPath = `${context}/meta.json`
      const readmePath = `${context}/README.md`

      const repoLink = meta.repo ? `[🔗 仓库](${meta.repo})` : '无'
      const dockerfileLink = `[📄 Dockerfile](${repoUrl}/blob/${currentBranch}/${dockerfilePath})`
      const metaLink = `[⚙️ meta.json](${repoUrl}/blob/${currentBranch}/${metaPath})`
      const readmeLink = `[📖 README](${repoUrl}/blob/${currentBranch}/${readmePath})`

      const errorMsg = app.error ? app.error.substring(0, 80) + (app.error.length > 80 ? '...' : '') : '未知错误'

      markdownContent += `| **${meta.name || 'unknown'}** | \`${meta.type || 'unknown'}\` | ${errorMsg} | ${repoLink} | ${dockerfileLink} | ${metaLink} | ${readmeLink} | ${app.duration}ms |\n`
    })
    markdownContent += '\n'
  }

  // 最新应用状态 (前10个)
  if (upToDateApps.length > 0) {
    const displayApps = upToDateApps.slice(0, 10)
    markdownContent += `## 已是最新版本 (显示 ${displayApps.length}/${upToDateApps.length})

| 应用名称 | 版本 | 类型 | 仓库地址 | Dockerfile | meta.json | 文档 | 执行时间 |
|---------|------|------|----------|------------|-----------|------|----------|
`
    displayApps.forEach((app) => {
      const meta = app.meta
      const context = meta.dockerMeta.context

      // 构建文件链接
      const dockerfilePath = `${context}/${meta.dockerMeta.dockerfile || 'Dockerfile'}`
      const metaPath = `${context}/meta.json`
      const readmePath = `${context}/README.md`

      const repoLink = meta.repo ? `[🔗 仓库](${meta.repo})` : '无'
      const dockerfileLink = `[📄 Dockerfile](${repoUrl}/blob/${currentBranch}/${dockerfilePath})`
      const metaLink = `[⚙️ meta.json](${repoUrl}/blob/${currentBranch}/${metaPath})`
      const readmeLink = `[📖 README](${repoUrl}/blob/${currentBranch}/${readmePath})`

      markdownContent += `| **${meta.name}** | \`${meta.version}\` | \`${meta.type}\` | ${repoLink} | ${dockerfileLink} | ${metaLink} | ${readmeLink} | ${app.duration}ms |\n`
    })

    if (upToDateApps.length > 10) {
      markdownContent += `\n<details>\n<summary>显示全部 ${upToDateApps.length} 个已是最新版本的应用</summary>\n\n`
      markdownContent += `| 应用名称 | 版本 | 类型 | 仓库地址 | Dockerfile | meta.json | 文档 | 执行时间 |\n|---------|------|------|----------|------------|-----------|------|----------|\n`
      upToDateApps.slice(10).forEach((app) => {
        const meta = app.meta
        const context = meta.dockerMeta.context

        const dockerfilePath = `${context}/${meta.dockerMeta.dockerfile || 'Dockerfile'}`
        const metaPath = `${context}/meta.json`
        const readmePath = `${context}/README.md`

        const repoLink = meta.repo ? `[🔗 仓库](${meta.repo})` : '无'
        const dockerfileLink = `[📄 Dockerfile](${repoUrl}/blob/${currentBranch}/${dockerfilePath})`
        const metaLink = `[⚙️ meta.json](${repoUrl}/blob/${currentBranch}/${metaPath})`
        const readmeLink = `[📖 README](${repoUrl}/blob/${currentBranch}/${readmePath})`

        markdownContent += `| **${meta.name}** | \`${meta.version}\` | \`${meta.type}\` | ${repoLink} | ${dockerfileLink} | ${metaLink} | ${readmeLink} | ${app.duration}ms |\n`
      })
      markdownContent += `\n</details>\n`
    }
    markdownContent += '\n'
  }

  // 状态说明
  markdownContent += `---

### 状态说明
- **可用更新**: 检测到新版本，可能会创建PR
- **已是最新版本**: 无需更新
- **检查错误**: 检查失败，请查看错误信息
- **🔗 查看PR**: PR已成功创建
- **⏳ 等待中**: 操作进行中
- **❌ 失败**: 操作失败

*生成时间: ${formatDate()} | 版本检查工作流*
`

  // 写入 GitHub Actions Summary
  await core.summary.addRaw(markdownContent).write()

  // 同时输出到日志
  const logger = createLoggerNs('Summary')
  logger.debug('GitHub Actions Summary 已生成')
}

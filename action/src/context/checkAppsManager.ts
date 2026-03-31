/**
 * 检查更新的应用管理类
 */
import type { CheckVariantResult, CreatePullRequestOptions } from '../types/index.js'
import type { Meta } from '../types/schema.js'
import path from 'node:path'
import process from 'node:process'
import * as core from '@actions/core'
import * as glob from '@actions/glob'
import { cyan, green, yellow } from 'kolorist'
import { createPullRequest } from 'octokit-plugin-create-pull-request'
import { checkVersionConfig, eventName, getOctokit, ghContext, ghContextPayload } from '../config.js'
import { pathExists, readJson } from '../file.js'
import { validateAppMeta } from '../lib/validator.js'
import { createLogger, getRandomColor, logger } from '../logger.js'
import { chunkArray } from '../utils.js'
import { CheckAppContext } from './checkAppContext.js'

type SummaryTableRows = Parameters<(typeof core.summary)['addTable']>[0]

export class CheckAppsManager {
  private readonly logger = createLogger()
  /**
   * 应用上下文映射：应用路径 -> CheckAppContext
   */
  apps: Map<string, CheckAppContext> = new Map()

  /**
   * 扫描应用目录，返回上下文应用列表
   */
  public async scanApps() {
    try {
      const patterns = ['apps/**/meta.json', 'base/**/meta.json', 'sync/**/meta.json']
      // const patterns = []
      // 计划任务中不允许检查开发过程中使用到的应用
      if (eventName !== 'schedule') {
        patterns.push('test/**/meta.json')
      }

      this.logger.debug(`Scanning with patterns: ${cyan(patterns.join(', '))}`)

      const globber = await glob.create(patterns.join('\n'))
      const metaFiles = await globber.glob()
      const contextList = await this.getCheckVersionContext() || []
      this.logger.debug(`Special context: ${contextList ? contextList.map(ctx => cyan(ctx)).join(', ') : 'all context'}`)

      const allApps = metaFiles.map(f => path.relative(process.cwd(), path.dirname(f)))
      const filterApps = contextList.length ? allApps.filter(app => contextList.includes(app)) : allApps

      this.logger.info(`Found ${green(filterApps.length)} apps to process: ${filterApps.map(app => cyan(app)).join(', ')}`)

      return filterApps
    }
    catch (error) {
      core.error(`Failed to scan apps: ${error instanceof Error ? error.message : 'Unknown error'}`)
      core.setFailed('Failed to scan apps')
    }
  }

  /**
   * 获取检查版本的上下文
   *
   * - 返回 `undefined` 表示检查所有应用
   * - 返回数组表示检查特定应用
   */
  public async getCheckVersionContext() {
    try {
      if (eventName === 'workflow_dispatch') {
        return checkVersionConfig.context ? checkVersionConfig.context.split(',').map(s => s.trim()) : undefined
      }
      else if (eventName === 'schedule') {
        return undefined
      }
      else if (eventName === 'push') {
        let files: string[] = []

        // 获取新增的、修改的文件列表
        const addedFiles = ghContextPayload.commits.flatMap(commit => commit.added || [])
        const modifiedFiles = ghContextPayload.commits.flatMap(commit => commit.modified || [])
        files = [...addedFiles, ...modifiedFiles]
        // 添加调试日志
        this.logger.debug(`All changed files from gh context: ${files.join(', ')}`)

        if (!files?.length) {
          const octokit = getOctokit(checkVersionConfig.token!)
          const { before: base, after: head } = ghContextPayload
          const { owner, repo } = ghContext.repo
          // 调 GitHub API 获取改动文件列表
          const res = await octokit.rest.repos.compareCommits({ owner, repo, base, head })
          files = res.data.files?.filter(file => ['added', 'modified', 'renamed'].includes(file.status))?.map(file => file.filename) || []
        }

        // 以 meta.json、Dockerfile、Dockerfile.<variant> 结尾的文件作为过滤条件
        // 会在外层作判断，所以这里一定有值
        // eslint-disable-next-line e18e/prefer-static-regex
        const filterFiles = files.filter(file => file.match(/(\/meta\.json$)|(\/Dockerfile(\.[^.]+)?$)/))

        // 添加调试日志
        this.logger.debug(`Filtered files: ${filterFiles.join(', ')}`)

        // 如果没有匹配的文件，退出工作流
        if (!filterFiles.length) {
          this.logger.info(`No relevant files found in push commit, skipping version check`)
          core.notice('No meta.json or Dockerfile changes detected, skipping version check')
          process.exit(0) // 正常退出，不报错
        }

        return [...new Set(filterFiles.map(file => path.relative(process.cwd(), path.dirname(file))))]
      }

      throw new Error(`Unsupported event: ${eventName}`)
    }
    catch (error) {
      core.error(`Failed to get check version context: ${error instanceof Error ? error.message : 'Unknown error'}`)
      core.setFailed('Failed to get check version context')
    }
  }

  /**
   * 加载应用上下文
   */
  public async loadApps(appPaths: string[]) {
    this.apps.clear()

    for (const appPath of appPaths) {
      try {
        const appContext = await this.loadAppContext(appPath)
        if (!appContext)
          continue
        this.apps.set(appPath, appContext)
      }
      catch (error) {
        logger.warn(yellow(`Failed to load app context for ${appPath}: ${error}`))
      }
    }
  }

  /**
   * 加载单个应用上下文
   *
   * - 验证 `meta.json` 格式
   * - 处理 `skip` 标志
   */
  public async loadAppContext(appPath: string, logger = this.logger) {
    const metaFile = appPath.endsWith('meta.json') ? appPath : path.join(appPath, 'meta.json')
    const context = path.relative(process.cwd(), path.dirname(metaFile))
    if (!pathExists(metaFile)) {
      logger.warn(yellow(`Meta file not found for app at ${appPath}`))
      return
    }

    const meta = await readJson<Meta>(metaFile)
    if (!meta) {
      logger.warn(yellow(`Failed to read meta.json for app at ${appPath}`))
      return
    }

    // 验证 meta 格式
    const valid = await validateAppMeta(meta)
    if (!valid) {
      logger.warn(yellow(`Invalid meta.json in ${context}`))
      return
    }

    // 判断是否 skip
    if (meta.skip) {
      logger.debug(`Skipping app ${context} due to skip flag`)
      return
    }

    return new CheckAppContext(context, meta)
  }

  /**
   * 循环检查所有应用的版本
   * - 存在并发处理
   */
  public async checkAllVersions() {
    const apps = [...this.apps.values()]
    const results = new Map<string, CheckVariantResult[]>()
    const outdatedApps = new Map<string, CheckVariantResult[]>()

    this.logger.debug(`Checking versions for ${apps.length} apps\n`)

    const { concurrency } = checkVersionConfig
    const chunkApps = chunkArray(apps, concurrency)

    let index = 0
    for await (const chunk of chunkApps) {
      index++
      const promises = chunk.map(async (app, i) => {
        const currentIndex = (index - 1) * concurrency + i + 1
        const color = getRandomColor()
        const appLogger = createLogger(`${currentIndex}/${apps.length} ${color(app.context)}`)

        try {
          appLogger.debug(`Processing app: ${cyan(app.context)}`)
          const versions = await app.checkVersions(appLogger)
          results.set(app.context, versions)

          const outdated = versions.filter(v => v.needsUpdate)
          appLogger.debug(`Processed app: ${cyan(app.context)} ${green(outdated.length)}/${green(versions.length)} variants need updates`)

          if (outdated.length) {
            appLogger.info(`✅ ${outdated.map(v => `${v.variantName}(${cyan(v.variant?.version || 'N/A')} => ${(green(v.version))})`).join(' ')}`)
            outdatedApps.set(app.context, outdated)
          }
          else {
            appLogger.debug(yellow('⚠️ No updates found'))
          }
        }
        catch (error) {
          appLogger.warn(yellow(`Failed to check version: ${error}`))
        }
      })

      await Promise.all(promises)
    }

    this.logger.line()

    return { allApps: results, outdatedApps }
  }

  /**
   * 构建 PR 数据
   */
  public async buildPrDatas(outdatedApps: Map<string, CheckVariantResult[]>): Promise<Map<string, CreatePullRequestOptions>> {
    const logger = this.logger.child()
    logger.debug('Building PR data for outdated apps...')

    const results = new Map<string, CreatePullRequestOptions>()
    for await (const [context, variants] of outdatedApps) {
      logger.debug(`Processing ${context}...`)

      const app = this.apps.get(context)
      if (!app) {
        logger.warn(yellow(`App context ${context} not found, skipping`))
        continue
      }

      const prData = await app.buildPrData(variants)
      if (!prData) {
        logger.warn(yellow(`No PR data returned for ${context}, skipping`))
        continue
      }

      results.set(context, prData)
    }

    return results
  }

  /**
   * 创建 PR 的具体操作
   */
  public async createPr(prDataList: Map<string, CreatePullRequestOptions>) {
    const { token } = checkVersionConfig
    if (!token) {
      this.logger.warn(yellow('No token provided, skipping PR creation'))
      return
    }

    const octokit = getOctokit(token, {}, createPullRequest as any)

    // @ts-expect-error ignore
    const createPR = octokit?.createPullRequest as ReturnType<typeof createPullRequest>['createPullRequest']

    if (!createPR) {
      this.logger.warn(yellow('Octokit createPullRequest plugin not available, skipping PR creation'))
      return
    }

    const result = new Map<string, { id: number, url: string }>()
    for await (const [context, prData] of prDataList) {
      this.logger.debug(`Creating PR for ${context}...`)

      try {
        const prResult = await createPR(prData)
        if (prResult) {
          result.set(context, { id: prResult.data.number, url: prResult.data.html_url })
          this.logger.info(`✅ Created PR for ${context}: ${prResult.data.html_url}`)
        }
        else {
          this.logger.warn(yellow(`No PR created for ${context}, no result returned`))
        }
      }
      catch (error) {
        core.error(error as Error)
        this.logger.error(`❌ Failed to create PR for ${context}:`, error)
      }
    }

    return result
  }

  /**
   * 生成摘要
   */
  public generateSummary(
    outdatedApps: Map<string, CheckVariantResult[]>,
    allApps: Map<string, CheckVariantResult[]>,
    prUrls?: Map<string, { id: number, url: string }>,
  ) {
    if (!outdatedApps?.size) {
      return
    }

    const tableRows: SummaryTableRows = []

    const headers: SummaryTableRows[0] = [
      { data: 'Application', header: true },
      { data: 'Variant', header: true },
      { data: 'Current Version', header: true },
      { data: 'Latest Version', header: true },
      { data: 'Status', header: true },
    ]

    prUrls && headers.push({ data: 'PR', header: true })
    tableRows.push(headers)

    // 遍历所有应用，添加到表格中
    for (const [appContext, variantResults] of allApps) {
      variantResults.forEach((result, index) => {
        const isOutdated = result.needsUpdate
        const status = isOutdated ? '🔄 需要更新' : '✅ 最新'
        const currentVersion = result.variant?.version || 'N/A'

        const rows: SummaryTableRows[0] = []
        if (index === 0) {
          rows.push({ data: `<strong>${appContext}</strong>`, rowspan: String(variantResults.length) })
        }
        rows.push(result.variantName)
        rows.push(`<code>${currentVersion}</code>`)
        rows.push(`<code>${result.version || 'N/A'}</code>`)
        rows.push(status)
        if (prUrls) {
          const prData = prUrls.get(appContext)
          rows.push(prData ? `<a href="${prData.url}">${prData.id}</a>` : 'N/A')
        }
        tableRows.push(rows)
      })
    }

    // 添加统计信息
    const totalVariants = [...allApps.values()].reduce((sum, variants) => sum + variants.length, 0)
    const outdatedVariants = [...outdatedApps.values()].reduce((sum, variants) => sum + variants.length, 0)

    core.summary.addRaw(`\n**统计信息**: 共检查 ${allApps.size} 个应用包含 ${totalVariants} 个变体，其中 ${outdatedVariants} 个变体需要更新\n`)

    core.summary.addTable(tableRows)
  }
}

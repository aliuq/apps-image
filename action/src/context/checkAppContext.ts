/**
 * 应用上下文 - 管理单个应用的完整生命周期
 */
import type {
  CheckVariantResult,
  CreatePullRequestOptions,
  Meta,
  PlaceholderData,
  ProcessedFile,
} from '../types/index.js'
import path from 'node:path'
import gh from '@actions/github'
import dayjs from 'dayjs'
import { cyan, yellow } from 'kolorist'
import { getCheckVersionConfig, getCurrentBranch } from '../config.js'
import { readFile } from '../file.js'
import { createLogger, getRandomColor } from '../logger.js'
import { detectRepo, detectRepoName, escapeHtml, escapeRegex } from '../utils.js'
import { VariantContext } from '../variant.js'

/**
 * 应用上下文类
 */
export class CheckAppContext {
  private readonly logger = createLogger('appContext')
  public readonly name: string // 应用名称（从 meta.json）
  private readonly originalMeta: Meta // 原始元数据（用于比较）

  constructor(public readonly context: string, private readonly meta: Meta) {
    this.name = meta.name
    this.logger = this.logger.child(context)
    this.originalMeta = JSON.parse(JSON.stringify(meta)) // 深拷贝原始元数据，避免直接修改
  }

  /**
   * 获取元数据（只读）
   */
  public getMeta(): Readonly<Meta> {
    return this.meta
  }

  /**
   * 检查版本
   * - 包含所有变体
   * - 按变体顺序执行
   */
  async checkVersions(logger = this.logger) {
    const results: CheckVariantResult[] = []

    for await (const [variantName, variant] of Object.entries(this.meta.variants)) {
      const color = getRandomColor()
      const variantLogger = logger.child(color(variantName))
      variantLogger.debug(`Processing app variant: ${cyan(`${this.name}:${variantName}`)}`)

      if ('enabled' in variant && !variant.enabled) {
        variantLogger.debug(yellow('Variant is disabled, skipping'))
        continue
      }

      const variantContext = new VariantContext(this.context, variantName, variant, variantLogger)
      const result = await variantContext.check()
      if (!result) {
        continue // 如果没有结果，跳过
      }

      results.push(result)
      variantLogger.debug(`Processed app variant: ${cyan(`${this.name}:${variantName}`)}`)
    }

    return results
  }

  /**
   * 构建 PR 数据
   * @param checkVariantResults 检查变体结果
   */
  public async buildPrData(checkVariantResults: CheckVariantResult[]): Promise<CreatePullRequestOptions> {
    const config = getCheckVersionConfig()
    const ghContext = gh.context

    // 1. 处理文件占位符替换
    const { files } = await this.processFiles(checkVariantResults)

    // 2. 构建 PR 描述
    const body = await this.buildPRBody(checkVariantResults)

    // 3. 设置变量
    const isDev = config.createPr === 'development'
    const branchPrefix = isDev ? 'test' : 'update'
    const title = checkVariantResults.map(r => `update ${r.variantName} version to ${r.version}`).join(', ')

    const prData: CreatePullRequestOptions = {
      owner: ghContext.repo.owner,
      repo: ghContext.repo.repo,
      title: `${branchPrefix}(${this.context}): ${title}`,
      body,
      head: `${branchPrefix}/${this.context.replace('/', '-')}`,
      base: getCurrentBranch(),
      labels: isDev ? [] : [this.name, 'automerge'],
      changes: [{
        files: files as any,
        commit: `${branchPrefix}(${this.context}): ${title}`,
      }],
    }

    return prData
  }

  /**
   * 处理文件占位符替换
   */
  private async processFiles(checkVariantResults: CheckVariantResult[]) {
    const meta = JSON.parse(JSON.stringify(this.originalMeta)) // 深拷贝 meta，避免直接修改原对象
    const processedFiles: ProcessedFile[] = []

    for await (const result of checkVariantResults) {
      try {
        const checkver = result.variant.checkver
        /** 变体名称 */
        const name = result.variantName

        // 仅修改 meta.json 的版本信息
        if (!meta.variants[name].version || !meta.variants[name].sha) {
          // 1. 如果没有，需要重新调整顺序
          meta.variants[name] = { version: result.version, sha: result.sha, ...meta.variants[name] }
        }
        else {
          meta.variants[name].version = result.version
          meta.variants[name].sha = result.sha
        }

        let processFiles = checkver?.processFiles || (name === 'latest' ? ['Dockerfile'] : [`Dockerfile.${name}`])

        if (!processFiles?.length) {
          this.logger.debug(`No processFiles defined for variant ${name}, skipping file processing`)
          continue // 如果没有需要处理的文件，跳过
        }
        if (processFiles.includes('meta.json')) {
          this.logger.warn(`Skipping meta.json processing for ${name}, it will be handled separately`)
          processFiles = processFiles.filter(file => file !== 'meta.json')
        }

        for await (const file of processFiles) {
          const filePath = path.join(this.context, file)
          const content = await readFile(filePath)
          if (!content) {
            this.logger.warn(`File ${file} not found in ${this.context}, skipping`)
            continue
          }

          const processedContent = this.resolveTemplate(content, {
            version: [result.version, result.variant?.version],
            sha: [result.sha.slice(0, 7), result.variant?.sha?.slice(0, 7)],
            fullSha: [result.sha, result.variant?.sha],
          })

          if (content === processedContent) {
            this.logger.info(`No changes detected in ${file}, skipping`)
            continue
          }

          processedFiles.push({
            path: filePath,
            content: processedContent,
            originalContent: content,
            changed: content !== processedContent,
          })
        }
      }
      catch (error) {
        this.logger.warn(`Failed to process variant ${result.variantName}:`, error)
      }
    }

    // this.logger.debug(`OriginalContent:\n${JSON.stringify(this.originalMeta, null, 2)}`)
    // this.logger.debug(`Content:\n${JSON.stringify(meta, null, 2)}`)

    // 添加 meta.json 到处理文件列表
    processedFiles.push({
      changed: true,
      path: path.join(this.context, 'meta.json'),
      content: JSON.stringify(meta, null, 2),
      originalContent: JSON.stringify(this.originalMeta, null, 2),
    })

    // 将处理后的文件转换为适合 PR 的格式
    const files: Record<string, { content: string, encoding: string }> = {}
    processedFiles.forEach(f => (files[f.path] = { content: f.content, encoding: 'utf-8' }))

    return { processedFiles, files }
  }

  /**
   * 构建 PR 描述内容
   */
  private async buildPRBody(checkVariantResults: CheckVariantResult[]) {
    const count = checkVariantResults?.length
    let body = `## 🚀 Auto-generated PR to update \`${this.name}\` versions\n\n`

    body += '### 📋 Summary\n\n'
    body += `| Variant Name | Source | Version | Revision |\n`
    body += `|--------------|--------|---------|----------|\n`

    let details = `### 🔍 Details\n\n`
    let index = 0

    for (const result of checkVariantResults) {
      index++
      const variant = result.variant
      const checkver = variant.checkver

      const repoName = checkver?.repo ? detectRepoName(checkver.repo) : 'N/A'
      const repoUrl = checkver?.repo ? detectRepo(checkver.repo) : 'N/A'

      const sha = result.sha
      const shortSha = result.sha.slice(0, 7)
      const oldSha = variant.sha
      const oldShortSha = oldSha?.slice(0, 7)

      const revisionOldValue = oldShortSha ? `[\`${oldShortSha}\`](${repoUrl}/commit/${oldSha})` : `\`N/A\``
      const revisionNewValue = `[\`${shortSha}\`](${repoUrl}/commit/${sha})`

      const nameValue = `\`${result.variantName}\``
      const sourceValue = checkver?.repo ? `[\`${repoName}\`](${repoUrl})` : `\`N/A\``
      const versionValue = `\`${variant.version || 'N/A'}\` → \`${result.version}\``
      const revisionValue = `${revisionOldValue} → ${revisionNewValue}`

      body += `| ${nameValue} | ${sourceValue} | ${versionValue} | ${revisionValue} |\n`

      if (result.commitInfo) {
        const { commitMessage, commitAuthor, commitDate, changedFiles, additions, deletions, recentCommits } = result.commitInfo
        const commitValue = commitMessage ? escapeHtml(commitMessage) : 'N/A'
        const authorValue = commitAuthor ? escapeHtml(commitAuthor) : 'N/A'
        const dateValue = commitDate ? dayjs(commitDate).format('YYYY-MM-DDTHH:mm:ssZ[Z]') : 'N/A'
        const changedValue = changedFiles > 0 ? `${changedFiles} files, +${additions}/-${deletions}` : 'N/A'

        if (count > 1) {
          details += `<details${index === 1 ? ' open' : ''}><summary>${result.variantName}</summary><p>\n\n`
        }
        else {
          details += `#### ${nameValue}\n\n`
        }

        details += `| Key | Value |\n`
        details += `|-----|-------|\n`
        details += `| **Repository** | ${sourceValue} |\n`
        details += `| **Latest Commit** | ${commitValue} |\n`
        details += `| **Author** | ${authorValue} |\n`
        details += `| **Date** | ${dateValue} |\n`
        details += `| **Changed** | ${changedValue} |\n\n`

        if (recentCommits?.length) {
          const compareUrl = `${repoUrl}/compare/${oldShortSha}...${shortSha}`

          details += `📝 Recent Commits\n\n`

          recentCommits.forEach((commit) => {
            const [recentCommitSha, ...messageParts] = commit.split(' ')
            const message = messageParts.join(' ').trim()
            details += `- [\`${recentCommitSha}\`](${repoUrl}/commit/${recentCommitSha}) ${escapeHtml(message)}\n`
          })

          details += `\n[🔗 View full comparison](${compareUrl})\n\n`
        }

        if (count > 1) {
          details += `</p></details>\n\n`
        }
      }
    }

    body += '\n\n'
    body += details

    // 自动合并说明
    body += `### ⚡ Auto-merge\n\n`
    body += `This PR is marked for auto-merge and will be automatically merged if all checks pass.\n`

    return body
  }

  /**
   * 替换内容中的占位符
   *
   * - 自动生成占位符格式的正则变体：['$key$', '{{key}}', '{key}']
   * - 如果数组元素有两个，则同时替换占位符和指定版本
   * - 如果数组元素只有一个，则只替换占位符
   */
  private resolveTemplate(template: string, data?: PlaceholderData) {
    if (!data || !Object.keys(data)?.length) {
      return template
    }

    let content = template

    // 处理自定义替换值
    for (const [key, values] of Object.entries(data)) {
      if (!values?.length)
        continue

      // 生成占位符正则
      const placeholderPattern = [`$${key}$`, `{{${key}}}`, `{${key}}`].map(escapeRegex).join('|')
      const placeholderReg = new RegExp(placeholderPattern, 'g')
      // 替换占位符
      content = content.replace(placeholderReg, values[0] ?? '')

      if (values.length === 2 && values[1]) {
        const oldValue = values[1]
        const oldValueReg = new RegExp(escapeRegex(oldValue), 'g')
        content = content.replace(oldValueReg, values[0])
      }
    }

    return content
  }
}

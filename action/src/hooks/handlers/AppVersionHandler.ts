import type { AppMeta, CheckResult, CreatePullRequestOptions } from '../../types.js'
import path from 'node:path'
import * as core from '@actions/core'
import * as gh from '@actions/github'
import fsa from 'fs-extra'
import { cyan, green, yellow } from 'kolorist'
import { getCurrentBranch } from '../../config.js'
import { createLoggerNs, escapeHtml, execCommand, formatDate } from '../../utils.js'

/**
 * 版本信息接口
 */
interface VersionInfo {
  version: string
  sha: string
}

interface CommitInfo {
  /** 提交信息 */
  commitMessage: string
  /** 提交作者 */
  commitAuthor: string
  /** 提交日期 */
  commitDate: string
  /** 修改的文件数量 */
  changedFiles: number
  /** 添加的行数 */
  additions: number
  /** 删除的行数 */
  deletions: number
  /** 最近的提交记录 */
  recentCommits: string[]
}

/**
 * 占位符数据接口
 *
 * - 用于替换文件内容中的占位符
 * - 键为占位符名称，值为包含新旧值的数组
 */
type PlaceholderData = Record<string, [string] | [string, string]>

/**
 * 文件处理结果接口
 */
interface FileProcessResult {
  filePath: string
  content: string
  hasChanged: boolean
}

export class AppVersionHandler {
  private cloneDir = ''
  /** `git -C ${this.cloneDir}` */
  private gitPrefix = ''
  private logger: ReturnType<typeof createLoggerNs> = createLoggerNs('AppVersionHandler')
  /** 开始的时间戳 */
  private startTime!: number

  /** 当前元数据 */
  private currentMeta!: AppMeta
  /** 原始元数据，用于比较和回滚 */
  private originalMeta!: AppMeta
  /** 版本信息 */
  private versionInfo!: VersionInfo
  /** 提交信息 */
  private commitInfo?: CommitInfo
  /** 已处理的文件列表 */
  private processedFiles: Map<string, FileProcessResult> = new Map()

  /**
   * 检查应用版本更新
   */
  async check(meta: AppMeta): Promise<CheckResult> {
    this.startTime = Date.now()
    this.initializeHandler(meta)

    try {
      this.logger.debug(`Starting ${this.currentMeta.checkVer.type} check`)

      await this.cloneRepository()
      this.versionInfo = await this.getVersionInfo()

      const hasUpdate = this.hasVersionUpdate()
      if (!hasUpdate) {
        this.logger.info(yellow('No updates found'))
        return this.createResult()
      }

      await this.updateCurrentMeta()
      const prData = await this.buildPRData()

      // 打印检查结果
      const checkType = this.originalMeta.checkVer.type
      const oldVer = green(this.originalMeta.version || 'N/A')
      const newVer = green(this.currentMeta.version || 'N/A')
      this.logger.info(`Found new ${cyan(checkType)} from ${oldVer} → ${newVer}`)

      return this.createResult(true, prData)
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logger.error(`Check failed: ${errorMessage}`)

      return this.createResult(false, errorMessage)
    }
    finally {
      await this.cleanup()
    }
  }

  /**
   * 初始化处理器状态
   *
   * + 设置原始元数据和当前元数据
   * + 设置克隆目录和 Git 前缀
   * + 创建日志记录器
   * + 重置版本信息和提交信息
   * + 重置已处理的文件列表
   */
  private initializeHandler(meta: AppMeta): void {
    this.originalMeta = meta
    this.currentMeta = { ...meta }
    this.cloneDir = `/tmp/${meta.dockerMeta.context}`
    this.gitPrefix = `git -C ${this.cloneDir}`
    this.logger = createLoggerNs(meta.dockerMeta.context, true)

    // 重置状态
    this.versionInfo = { version: '', sha: '' }
    this.commitInfo = undefined
    this.processedFiles.clear()
  }

  /**
   * 更新元数据
   *
   * 1. 将当前元数据和版本信息合并
   * 2. 解析模板字符串中的占位符
   * 3. 处理 `dockerMeta.tags`
   * 4. 打印更新后的元数据
   */
  private async updateCurrentMeta() {
    const meta = { ...this.currentMeta, ...this.versionInfo }
    const metaStr = JSON.stringify(meta, null, 2)
    const resolvedMetaStr = this.resolveTemplate(metaStr, this.getPlaceholderData())
    const newMeta: AppMeta = JSON.parse(resolvedMetaStr)

    // 处理 dockerMeta.tags
    if (!newMeta.dockerMeta?.tags?.length) {
      newMeta.dockerMeta.tags = [
        'type=raw,value=latest',
        `type=raw,value=${newMeta.version}`,
        `type=raw,value=${newMeta.sha.slice(0, 7)}`,
      ]
    }
    newMeta.dockerMeta.tags = Array.from(new Set(newMeta.dockerMeta.tags))
    this.currentMeta = newMeta

    // 打印更新后的元数据
    await this.logger.debugGroupJson('Meta resolved', this.currentMeta)
  }

  /**
   * 创建检查结果对象
   * - 如果 status 为 true，则 data 为 PR 数据
   * - 如果 status 为 false，则 data 为错误信息
   */
  private createResult(status: boolean = true, data?: any): CheckResult {
    return {
      hasUpdate: this.hasVersionUpdate(),
      meta: this.currentMeta,
      oldMeta: this.originalMeta,
      status: status ? 'success' : 'error',
      duration: Date.now() - this.startTime,
      pr: status ? { data } : undefined,
      error: !status ? data : undefined,
    }
  }

  /**
   * 检查是否有版本更新
   *
   * 1. 确保已经执行过 `await this.getVersionInfo()`
   */
  private hasVersionUpdate(): boolean {
    return this.versionInfo.version !== this.originalMeta.version || this.versionInfo.sha !== this.originalMeta.sha
  }

  /**
   * 清理临时资源
   */
  private async cleanup(): Promise<void> {
    try {
      await fsa.remove(this.cloneDir)
    }
    catch {
      // 忽略清理错误
    }
  }

  /**
   * 根据检查类型获取版本信息
   */
  private async getVersionInfo(): Promise<VersionInfo> {
    const handlers = {
      version: () => this.getVersionFromFile(),
      sha: () => this.getVersionFromSha(),
      tag: () => this.getVersionFromTag(),
    } as const

    const handler = handlers[this.currentMeta.checkVer.type]
    if (!handler) {
      throw new Error(`Unsupported check type: ${this.currentMeta.checkVer.type}`)
    }

    return handler()
  }

  /**
   * 从版本文件获取版本信息
   */
  private async getVersionFromFile(): Promise<VersionInfo> {
    const { file } = this.currentMeta.checkVer
    if (!file) {
      throw new Error('Version file not specified')
    }

    const filePath = path.join(this.cloneDir, file)
    this.logger.debug(`Checking version file: ${filePath}`)

    if (!await fsa.pathExists(filePath)) {
      this.logger.debug(`Version file not found, using current version`)
      return { version: this.currentMeta.version, sha: this.currentMeta.sha }
    }

    const version = file.endsWith('package.json')
      ? await this.extractVersionFromPackageJson(filePath)
      : await this.extractVersionFromFile(filePath, this.currentMeta.checkVer.regex)

    const sha = await this.getFileSha(file)
    this.logger.debug(`Found version: ${version}, SHA: ${sha}`)

    return { version, sha }
  }

  /**
   * 从 package.json 提取版本
   */
  private async extractVersionFromPackageJson(filePath: string): Promise<string> {
    const pkgContent = await fsa.readJSON(filePath)
    return pkgContent?.version?.replace(/^v/, '') || ''
  }

  /**
   * 从文件提取版本（支持正则）
   * - 文件是指对应仓库中的文件
   */
  private async extractVersionFromFile(filePath: string, regex?: string): Promise<string> {
    const content = await fsa.readFile(filePath, 'utf-8')

    if (regex) {
      const match = content.trim().match(new RegExp(regex))
      if (match?.[1]) {
        return match[1].trim().replace(/^v/, '')
      }
      this.logger.warning(`Regex pattern "${regex}" did not match file content`)
    }

    return content.trim().replace(/^v/, '')
  }

  /**
   * 从 SHA 获取版本信息
   */
  private async getVersionFromSha(): Promise<VersionInfo> {
    const sha = await execCommand(`${this.gitPrefix} log -1 --format=%H`)
    const cleanSha = sha.trim()
    const version = cleanSha.slice(0, 7)

    this.logger.debug(`Found version from SHA: ${version}`)
    return { version, sha: cleanSha }
  }

  /**
   * 从标签获取版本信息
   */
  private async getVersionFromTag(): Promise<VersionInfo> {
    const tag = await execCommand(`${this.gitPrefix} describe --tags --abbrev=0`)
    const sha = await execCommand(`${this.gitPrefix} rev-list -n 1 ${tag}`)
    const version = tag.trim().replace(/^v/, '')
    const cleanSha = sha.trim()

    this.logger.debug(`Found version from tag: ${version}`)
    return { version, sha: cleanSha }
  }

  /**
   * 克隆远程仓库
   *
   * 1. 确保克隆目录存在
   * 2. 使用 `git clone` 命令克隆仓库
   * 3. 如果指定了分支, 切换到对应的分支
   * 4. 如果指定了目标版本，切换到对应的版本
   */
  private async cloneRepository(): Promise<void> {
    // 确保克隆目录存在
    await fsa.ensureDir(this.cloneDir)

    const { branch, targetVersion } = this.currentMeta.checkVer
    const cloneCmd = branch
      ? `git clone -b ${branch} ${this.currentMeta.repo} ${this.cloneDir}`
      : `git clone ${this.currentMeta.repo} ${this.cloneDir}`

    await execCommand(cloneCmd)
    this.logger.debug(`Repository cloned to ${this.cloneDir}`)

    if (targetVersion) {
      await execCommand(`${this.gitPrefix} checkout ${targetVersion}`)
      this.logger.debug(`Checked out to version ${targetVersion}`)
    }
  }

  /**
   * 获取指定文件的最新 SHA
   */
  private async getFileSha(file: string): Promise<string> {
    const sha = await execCommand(`${this.gitPrefix} log -G"version" --format=%H -n 1 -- ${file}`)
    return sha.trim()
  }

  /**
   * 收集提交信息
   *
   * 1. 获取提交信息
   * 2. 获取变更统计信息
   * 3. 获取最近的提交记录
   */
  private async collectCommitInfo(): Promise<void> {
    const defaultCommitInfo: CommitInfo = {
      commitMessage: '',
      commitAuthor: '',
      commitDate: '',
      changedFiles: 0,
      additions: 0,
      deletions: 0,
      recentCommits: [],
    }

    try {
      const oldSha = this.originalMeta.sha || ''
      const sha = this.currentMeta.sha

      // SHA 值相同，代表没有变更
      if (sha === oldSha) {
        this.commitInfo = defaultCommitInfo
        return
      }

      // 1. 获取提交信息
      const [commitMessage, commitAuthor, commitDate] = await Promise.all([
        execCommand(`${this.gitPrefix} log -1 --format=%s ${sha}`),
        execCommand(`${this.gitPrefix} log -1 --format="%an <%ae>" ${sha}`),
        execCommand(`${this.gitPrefix} log -1 --format=%ci ${sha}`),
      ])

      // 2. 获取变更统计信息
      const diffSha = oldSha ? `${oldSha}..${sha}` : sha
      const [changedFilesOutput, diffStat] = await Promise.all([
        execCommand(`${this.gitPrefix} diff --name-only ${diffSha}`),
        execCommand(`${this.gitPrefix} diff --shortstat ${diffSha}`),
      ])

      const changedFiles = changedFilesOutput.trim() ? changedFilesOutput.trim().split('\n').length : 0
      let additions = 0
      let deletions = 0
      // 解析类似 "5 files changed, 123 insertions(+), 45 deletions(-)" 的输出
      if (diffStat.trim()) {
        const insertionMatch = diffStat.match(/(\d+) insertions?\(\+\)/)
        const deletionMatch = diffStat.match(/(\d+) deletions?\(-\)/)

        additions = insertionMatch ? Number.parseInt(insertionMatch[1]) : 0
        deletions = deletionMatch ? Number.parseInt(deletionMatch[1]) : 0
      }

      // 3. 获取最近的提交记录
      const recentCommitsOutput = await execCommand(`${this.gitPrefix} log --oneline ${diffSha}`)
      const recentCommits = recentCommitsOutput.trim()
        ? recentCommitsOutput.trim().split('\n').filter(Boolean).slice(0, 10)
        : []

      this.commitInfo = {
        commitMessage: commitMessage.trim(),
        commitAuthor: commitAuthor.trim(),
        commitDate: commitDate.trim(),
        changedFiles,
        additions,
        deletions,
        recentCommits,
      }

      await this.logger.debugGroupJson('Commit info', this.commitInfo)
    }
    catch (error) {
      this.logger.warning(`Failed to collect commit info: ${error}`)
      this.commitInfo = defaultCommitInfo
    }
  }

  /**
   * 获取默认的占位符数据，新的版本来源于 versionInfo
   *
   * - `version`
   * - `sha`
   * - `fullSha`
   */
  private getPlaceholderData(): PlaceholderData {
    const { sha, version } = this.versionInfo
    const { sha: oldSha, version: oldVersion } = this.originalMeta
    return {
      version: [version, oldVersion],
      sha: [sha.slice(0, 7), oldSha?.slice(0, 7)],
      fullSha: [sha, oldSha],
    }
  }

  /**
   * 处理所有需要更新的文件
   */
  private async processAllFiles() {
    const filesToProcess = await this.getFilesToProcess()

    for (const filePath of filesToProcess) {
      await this.processFile(filePath)
    }

    await this.logger.debugGroup('Files processed', async () => {
      for (const [filePath, result] of this.processedFiles) {
        core.info(`${filePath}: ${result.hasChanged ? 'modified' : 'unchanged'}`)
      }
    })
  }

  /**
   * 获取需要处理的文件列表
   *
   * 默认处理：
   * 1. `meta.json`
   * 2. `Dockerfile` (来自 `dockerMeta.dockerfile`)
   * 3. `processFiles` 配置的额外文件（相对于 `context` 目录）
   */
  private async getFilesToProcess(): Promise<string[]> {
    const files: string[] = []
    const contextPath = this.currentMeta.dockerMeta.context

    // 1. 默认处理 meta.json
    files.push(path.join(contextPath, 'meta.json'))

    // 2. 默认处理 Dockerfile
    files.push(path.join(contextPath, this.currentMeta.dockerMeta.dockerfile))

    // 3. 添加 processFiles 配置的额外文件
    const processFiles = this.currentMeta.checkVer?.processFiles
    if (Array.isArray(processFiles)) {
      processFiles.forEach(filePath => files.push(path.join(contextPath, filePath)))
    }

    this.logger.debug(`Found ${files.length} files to process: ${files.join(', ')}`)
    return files
  }

  /**
   * 处理单个文件，version 和 SHA 值替换
   */
  private async processFile(filePath: string) {
    try {
      if (!await fsa.pathExists(filePath)) {
        this.logger.warning(`File not found: ${filePath}`)
        return
      }

      const originalContent = await fsa.readFile(filePath, 'utf-8')
      const hasUpdate = this.hasVersionUpdate()

      const content = hasUpdate
        ? this.resolveTemplate(originalContent, this.getPlaceholderData())
        : originalContent

      this.processedFiles.set(filePath, {
        filePath,
        content,
        hasChanged: originalContent !== content,
      })
    }
    catch (error) {
      this.logger.warning(`Failed to process file ${filePath}: ${error}`)
    }
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
      const placeholderPattern = [`$${key}$`, `{{${key}}}`, `{${key}}`].map(this.escapeRegex).join('|')
      const placeholderReg = new RegExp(placeholderPattern, 'g')
      // 替换占位符
      content = content.replace(placeholderReg, values[0])

      if (values.length === 2 && values[1]) {
        const oldValue = values[1]
        const oldValueReg = new RegExp(this.escapeRegex(oldValue), 'g')
        content = content.replace(oldValueReg, values[0])
      }
    }

    return content
  }

  /**
   * 转义正则表达式特殊字符
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  /**
   * 构建 PR 数据
   */
  private async buildPRData(): Promise<CreatePullRequestOptions> {
    const ghContext = gh.context
    // 创建 PR，但不触发后续工作流
    const createPrMock = core.getBooleanInput('mock')
    // 获取默认分支
    const defaultBranch = core.getInput('default_branch') || getCurrentBranch()
    // 工作目录
    const context = this.currentMeta.dockerMeta.context

    const branchPrefix = createPrMock ? 'mock/update' : 'update'
    const titlePrefix = createPrMock ? 'mock' : 'chore'

    const prBody = await this.buildPRBody()
    const metaPath = path.join(context, 'meta.json')

    const prData: CreatePullRequestOptions = {
      owner: ghContext.repo.owner,
      repo: ghContext.repo.repo,
      title: `${titlePrefix}(${context}): update version to ${this.currentMeta.version}`,
      head: `${branchPrefix}/${this.currentMeta.name}-${this.currentMeta.version}`,
      base: defaultBranch,
      labels: ['automerge'],
      body: prBody,
      changes: [{
        files: { [metaPath]: { content: JSON.stringify(this.currentMeta, null, 2), encoding: 'utf-8' } },
        commit: `chore(${context}): update version to ${this.currentMeta.version}`,
      }],
    }

    // 处理所有文件
    await this.processAllFiles()

    // 添加所有有变更的文件到 PR 中
    for (const [filePath, result] of this.processedFiles) {
      if (result.hasChanged && filePath !== metaPath) {
        // @ts-expect-error - 动态添加文件到已有的 changes 对象
        prData.changes[0].files[filePath] = { content: result.content, encoding: 'utf-8' }
      }
    }

    await this.logger.debugGroupJson('PR Data', prData)

    return prData
  }

  /**
   * 构建 PR 描述内容
   */
  private async buildPRBody(): Promise<string> {
    const { repo, sha, name, version } = this.currentMeta
    const repoName = repo.split('/').pop()?.replace('.git', '') || 'repository'
    const repoUrl = repo.replace('.git', '')

    const shortSha = sha.slice(0, 7)
    const oldSha = this.originalMeta.sha
    const oldShortSha = oldSha.slice(0, 7)

    let body = `## 🚀 Auto-generated PR to update ${name} version to \`${version}\`\n\n`

    // 基本信息表格
    const revisionOldValue = `[\`${oldShortSha}\`](${repoUrl}/commit/${oldSha})`
    const revisionNewValue = `[\`${shortSha}\`](${repoUrl}/commit/${sha})`

    body += '### 📋 Basic Information\n\n'
    body += `| Key | Value |\n`
    body += `|-----|-------|\n`
    body += `| **Repository** | [${repoName}](${repoUrl}) |\n`
    body += `| **Version** | \`${this.originalMeta.version}\` → \`${version}\` |\n`
    body += `| **Revision** | ${revisionOldValue} → ${revisionNewValue} |\n`

    // 确保提交信息已收集
    if (!this.commitInfo) {
      await this.collectCommitInfo()
    }

    const {
      commitMessage,
      commitAuthor,
      commitDate,
      changedFiles,
      additions,
      deletions,
      recentCommits,
    } = this.commitInfo || {} as CommitInfo

    // 提交信息
    if (commitMessage) {
      body += `| **Latest Commit** | ${escapeHtml(commitMessage)} |\n`
      body += `| **Author** | ${commitAuthor} |\n`
      body += `| **Date** | ${formatDate(commitDate)} |\n`

      if (changedFiles > 0) {
        body += `| **Changes** | ${changedFiles} files, +${additions}/-${deletions} |\n`
      }
      body += `\n`
    }

    if (recentCommits?.length) {
      body += `### 📝 Recent Commits\n\n`

      recentCommits.forEach((commit) => {
        const [recentCommitSha, ...messageParts] = commit.split(' ')
        const message = messageParts.join(' ').trim()
        body += `- [\`${recentCommitSha}\`](${repoUrl}/commit/${recentCommitSha}) ${escapeHtml(message)}\n`
      })

      const compareUrl = `${repoUrl}/compare/${oldShortSha}...${shortSha}`
      body += `\n[🔗 View full comparison](${compareUrl})\n\n`
    }

    // 自动合并说明
    body += `### ⚡ Auto-merge\n\n`
    body += `This PR is marked for auto-merge and will be automatically merged if all checks pass.\n`

    return body
  }
}

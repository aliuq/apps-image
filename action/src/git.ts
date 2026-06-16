import type { GitCommitInfo } from './types/index.js'
/**
 * Git 仓库相关操作
 */
import { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import path from 'node:path'
import * as exec from '@actions/exec'
import { cyan, gray, red, yellow } from 'kolorist'
import { CaCheDir } from './config.js'
import { pathExists, readFile, readJson } from './file.js'
import { createLogger } from './logger.js'

export interface CloneOptions {
  branch?: string
  // depth?: number
  targetVersion?: string
  context?: string
}

export class Git {
  constructor(
    private readonly cacheDir = CaCheDir,
    private readonly logger = createLogger('git'),
  ) {}

  /**
   * 克隆或更新仓库
   */
  public async cloneOrUpdateRepo(repoUrl: string, options: CloneOptions = {}) {
    const repoName = this.getRepoName(repoUrl)
    const repoDisplayName = this.detectRepoName(repoUrl)
    const dirName = options.context ? `${repoName}_${options.context.replace(/[^\w-]/g, '_')}` : repoName
    const repoPath = path.join(this.cacheDir, dirName)

    try {
      const exists = await pathExists(repoPath)
      this.logger.debug(`Checking if repository ${cyan(repoPath)} exists: ${exists}`)
      if (exists) {
        const isReusable = await this.isReusableRepo(repoPath, repoUrl)

        if (!isReusable) {
          this.logger.debug(yellow(`Repository ${dirName} cache is invalid, recreating...`))
          await this.rebuildRepo(repoUrl, repoPath, options)
        }
        else {
          this.logger.debug(`Repository ${dirName} exists, updating...`)
          try {
            await this.updateRepo(repoPath, options)
          }
          catch (error) {
            this.logger.debug(yellow(`Git update failed in cached repository ${repoPath}, recreating cache: ${error}`))
            await this.rebuildRepo(repoUrl, repoPath, options)
          }
        }
      }
      else {
        this.logger.debug(`Cloning repository ${repoUrl} to ${dirName}...`)
        await this.cloneRepo(repoUrl, repoPath, options)
      }

      return repoPath
    }
    catch (error) {
      this.logger.error(red(`Failed to clone/update repository ${repoDisplayName} (context: ${options.context}): ${error}`))
      throw error
    }
  }

  /**
   * 克隆仓库
   */
  public async cloneRepo(repoUrl: string, targetPath: string, options: CloneOptions = {}): Promise<void> {
    const { branch, targetVersion } = options

    // 构建 git clone 命令
    const args = ['clone']

    // 只有在指定了 branch 时才添加 --branch 参数
    if (branch) {
      args.push('--branch', branch)
    }

    // args.push('--depth', depth.toString())
    args.push(repoUrl, targetPath)

    const command = `git ${args.join(' ')}`

    try {
      await this.exec(command)

      // 如果指定了 targetVersion 且不是分支，则检出到指定版本
      if (targetVersion && targetVersion !== branch) {
        await this.checkoutVersion(targetPath, targetVersion)
      }
    }
    catch (error) {
      this.logger.error(red(`Git clone failed: ${command}\n${error}`))
      throw new Error(`Failed to clone repository: ${error}`)
    }
  }

  /**
   * 更新仓库
   */
  public async updateRepo(repoPath: string, options: CloneOptions = {}): Promise<void> {
    const { branch, targetVersion } = options

    try {
      // 获取最新代码
      await this.exec('git fetch --all --tags --prune', { cwd: repoPath })

      const updateBranch = await this.resolveUpdateBranch(repoPath, branch)
      await this.exec(`git checkout -B ${updateBranch} origin/${updateBranch}`, { cwd: repoPath })

      // 如果指定了目标版本，检出到该版本
      if (targetVersion && targetVersion !== branch) {
        await this.checkoutVersion(repoPath, targetVersion)
      }
    }
    catch (error) {
      throw new Error(`Failed to update repository: ${error}`)
    }
  }

  private async isReusableRepo(repoPath: string, repoUrl: string): Promise<boolean> {
    try {
      const { stdout: isWorkTree } = await this.exec('git rev-parse --is-inside-work-tree', { cwd: repoPath })
      if (isWorkTree.trim() !== 'true') {
        this.logger.debug(yellow(`Cached path is not a git work tree: ${repoPath}`))
        return false
      }

      const { stdout: remoteUrl } = await this.exec('git remote get-url origin', { cwd: repoPath })
      const expectedRepo = this.normalizeRepoRef(repoUrl)
      const actualRepo = this.normalizeRepoRef(remoteUrl)

      if (expectedRepo !== actualRepo) {
        this.logger.debug(yellow(`Cached repository origin mismatch: expected ${expectedRepo}, got ${actualRepo}`))
        return false
      }

      return true
    }
    catch (error) {
      this.logger.debug(yellow(`Failed to validate cached repository ${repoPath}: ${error}`))
      return false
    }
  }

  private async rebuildRepo(repoUrl: string, repoPath: string, options: CloneOptions = {}) {
    await fs.rm(repoPath, { recursive: true, force: true })
    await this.cloneRepo(repoUrl, repoPath, options)
  }

  private async resolveUpdateBranch(repoPath: string, branch?: string) {
    if (branch) {
      return branch
    }

    const branchCandidates = [
      'git rev-parse --abbrev-ref origin/HEAD',
      'git branch --show-current',
    ]

    for (const command of branchCandidates) {
      try {
        const { stdout } = await this.exec(command, { cwd: repoPath })
        const resolvedBranch = stdout.trim().replace(/^origin\//, '')

        if (resolvedBranch && resolvedBranch !== 'HEAD') {
          return resolvedBranch
        }
      }
      catch {
        continue
      }
    }

    throw new Error(`Failed to resolve update branch for cached repository: ${repoPath}`)
  }

  private normalizeRepoRef(repo: string) {
    const normalizedRepo = repo.trim().replace(/\/$/, '').replace(/\.git$/, '')
    const detectedRepo = this.detectRepoName(normalizedRepo)

    if (/^[^/]+\/[^/]+$/.test(detectedRepo)) {
      return detectedRepo.toLowerCase()
    }

    return normalizedRepo
  }

  /**
   * 将浅克隆转成完整克隆
   */
  public async unshallow(repoPath: string) {
    try {
      const { stdout: isShallow } = await this.exec('git rev-parse --is-shallow-repository', { cwd: repoPath })
      this.logger.debug(`isShallow ${isShallow}`)
      isShallow && await this.exec('git fetch --unshallow', { cwd: repoPath })
    }
    catch (error) {
      // 如果已经在完整克隆，会报错，但是可以忽略
      this.logger.debug(yellow(`Git unshallow failed in ${repoPath}: ${error}`))
    }
  }

  /**
   * 检出到指定版本
   */
  private async checkoutVersion(repoPath: string, version: string): Promise<void> {
    try {
      await this.exec(`git checkout ${version}`, { cwd: repoPath })
      this.logger.debug(`Checked out to version: ${cyan(version)}`)
    }
    catch (error) {
      this.logger.error(red(`Failed to checkout version ${version}: ${error}`))
      throw new Error(`Failed to checkout to version ${version}: ${error}`)
    }
  }

  /**
   * 获取所有标签（按时间倒序）
   */
  public async getAllTags(repoPath: string) {
    const command = 'git tag --sort=-creatordate'
    const { stdout } = await this.exec(command, { cwd: repoPath })
    const tags = stdout.trim().split('\n').filter(tag => tag.length > 0)
    return tags
  }

  /**
   * 获取最新的提交 SHA
   */
  public async getSha(repoPath: string, filePath?: string) {
    const command = `git log -1 --format=%H${filePath ? ` -- ${filePath}` : ''}`
    const { stdout } = await this.exec(command, { cwd: repoPath })
    return stdout.trim()
  }

  /**
   * 获取指定文件的最新 SHA
   */
  public async getFileSha(repoPath: string, file: string) {
    const command = `git log -G"version" --format=%H -n 1 -- ${file}`
    const { stdout } = await this.exec(command, { cwd: repoPath })
    return stdout.trim()
  }

  /**
   * 获取指定路径的最新 SHA
   */
  public async getPathSha(repoPath: string, filePath: string) {
    const command = `git log -1 --format=%H -- ${filePath}`
    const { stdout } = await this.exec(command, { cwd: repoPath })
    return stdout.trim()
  }

  /**
   * 获取指定标签的最新 SHA
   */
  public async getTagSha(repoPath: string, tag: string) {
    const command = `git rev-list -n 1 ${tag}`
    const { stdout } = await this.exec(command, { cwd: repoPath })
    return stdout.trim()
  }

  /**
   * 从短 SHA 获取完整 SHA
   */
  public async getShaFromShortSha(repoPath: string, shortSha: string) {
    const command = `git rev-parse ${shortSha}`
    const { stdout } = await this.exec(command, { cwd: repoPath })
    return stdout.trim()
  }

  /**
   * 获取提交的文件内容
   */
  public async getCommitFile(repoPath: string, commit: string, file: string) {
    try {
      const { stdout } = await this.exec(`git show ${commit}:${file}`, { cwd: repoPath })
      return stdout
    }
    catch {
      return null // 文件不存在
    }
  }

  /**
   * 读取仓库中的文件内容
   */
  public async readFile(repoPath: string, filePath: string) {
    try {
      const fullPath = path.join(repoPath, filePath)
      return await readFile(fullPath)
    }
    catch (error) {
      this.logger.error(red(`Failed to read file ${filePath} from ${repoPath}: ${error}`))
      throw error
    }
  }

  /**
   * 读取 JSON 文件内容
   */
  public async readJson<T = any>(repoPath: string, filePath: string) {
    try {
      const fullPath = path.join(repoPath, filePath)
      return await readJson<T>(fullPath)
    }
    catch (error) {
      this.logger.error(red(`Failed to read JSON file ${filePath} from ${repoPath}: ${error}`))
      throw error
    }
  }

  /**
   * 从 URL 提取仓库名称
   */
  private getRepoName(repoUrl: string): string {
    // 从 URL 中提取仓库名称，如 https://github.com/user/repo.git -> user-repo
    const match = repoUrl.match(/\/([^/]+)\/([^/]+?)(?:\.git)?$/)
    if (match) {
      return `${match[1]}-${match[2]}`
    }

    // 如果无法解析，使用 URL 的 hash 作为目录名
    return Buffer.from(repoUrl).toString('base64').replace(/[/+=]/g, '_')
  }

  /**
   * 提取 `owner/repo`
   * - 如果是 GitHub URL，则提取 `owner/repo`
   * - 如果已经是简写格式，则直接返回
   * - 非 GitHub URL 返回原值以保持完整地址标识
   */
  private detectRepoName(repo: string) {
    // 只支持 GitHub 平台的 URL 格式
    // 支持: https://github.com/owner/repo
    const httpsMatch = repo.match(/https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/)

    if (httpsMatch) {
      return `${httpsMatch[1]}/${httpsMatch[2]}`
    }

    // 如果已经是 owner/repo 格式，直接返回
    if (/^[^/]+\/[^/]+$/.test(repo)) {
      return repo
    }

    // 非 GitHub URL 返回原值以保持完整地址标识
    return repo
  }

  public async exec(command: string, options: exec.ExecOptions = {}) {
    if (!('silent' in options)) {
      options.silent = true
    }
    this.logger.debug(`> ${gray(command)}`)
    return await exec.getExecOutput(command, [], options)
  }

  /**
   * 收集提交信息
   *
   * 1. 获取提交信息
   * 2. 获取变更统计信息
   * 3. 获取最近的提交记录
   */
  public async collectCommitInfo(repoPath: string, sha: string, oldSha?: string) {
    try {
      // SHA 值相同，代表没有变更
      if (sha === oldSha) {
        this.logger.debug(`No changes detected for ${cyan(repoPath)} since last commit.`)
        return
      }

      // 1. 获取提交信息
      const [commitMessage, commitAuthor, commitDate] = (await Promise.all([
        this.exec(`git log -1 --format=%s ${sha}`, { cwd: repoPath }),
        this.exec(`git log -1 --format="%an <%ae>" ${sha}`, { cwd: repoPath }),
        this.exec(`git log -1 --format=%ci ${sha}`, { cwd: repoPath }),
      ])).map(output => output.stdout.trim())

      // 2. 获取变更统计信息
      const diffSha = oldSha ? `${oldSha}..${sha}` : sha
      const [changedFilesOutput, diffStat] = (await Promise.all([
        this.exec(`git diff --name-only ${diffSha}`, { cwd: repoPath }),
        this.exec(`git diff --shortstat ${diffSha}`, { cwd: repoPath }),
      ])).map(output => output.stdout.trim())

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
      const { stdout: recentCommitsOutput } = await this.exec(`git log --oneline ${diffSha}`, { cwd: repoPath })
      const recentCommits = recentCommitsOutput.trim()
        ? recentCommitsOutput.trim().split('\n').filter(Boolean).slice(0, 10)
        : []

      const commitInfo: GitCommitInfo = {
        commitMessage: commitMessage.trim(),
        commitAuthor: commitAuthor.trim(),
        commitDate: commitDate.trim(),
        changedFiles,
        additions,
        deletions,
        recentCommits,
      }

      this.logger.debug(`Collected commit info for ${cyan(repoPath)}:`)
      return commitInfo
    }
    catch (error) {
      this.logger.warn(yellow(`Failed to collect commit info: ${error}`))
    }
  }
}

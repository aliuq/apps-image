/**
 * 单个变体的上下文
 */

import type { GitCommitInfo } from './types/git.js'
import type { CheckVariantResult } from './types/index.js'
import type { CheckVersionType, ImageVariant } from './types/schema.js'
import { cyan, green, red, yellow } from 'kolorist'
import { valid as semverValid } from 'semver'
import { CaCheDir } from './config.js'
import { Git } from './git.js'
import { createLogger } from './logger.js'

/**
 * TODO 暂时必须有 `checkver.repo`
 *
 * 类型为 `version`、`sha`、`tag` 时，必须有 `checkver.repo`
 * 但是不确定是否将同步镜像也写到里面
 */
export class VariantContext {
  private readonly git: Git
  private readonly repo: string
  private readonly repoName: string | null = null
  private readonly type: CheckVersionType | null = null

  constructor(
    public readonly context: string,
    public readonly name: string,
    public readonly variant: ImageVariant,
    private readonly logger = createLogger('variantContext'),
  ) {
    if (variant?.checkver?.repo) {
      variant.checkver.repo = this.detectRepo(variant.checkver.repo)
    }

    this.type = variant?.checkver?.type
    this.git = new Git(CaCheDir, logger)
    this.repo = variant.checkver.repo!
    this.repoName = this.repo ? this.detectRepoName(this.repo) : ''

    this.logger.data('Variant Info', {
      type: this.type || 'N/A',
      repo: this.repoName || 'N/A',
      context,
      variantName: name,
    })
  }

  /**
   * 检查版本更新的具体操作函数
   */
  public async check() {
    const { version, sha, checkver } = this.variant

    if (!checkver || !checkver.repo) {
      this.logger.warn(yellow('Missing checkver configuration or repo URL'))
      return
    }

    this.logger.debug(`Checking...`)

    try {
      const repoPath = await this.git?.cloneOrUpdateRepo(this.repo, {
        branch: checkver.branch,
        targetVersion: checkver.targetVersion,
        context: this.context,
      })
      const result = await this.checkVersionByType(repoPath)
      if (!result) {
        this.logger.warn(yellow('Failed to check version, no result returned'))
        return
      }
      this.logger.data('✅ Done', { variant: this.name, ...result })

      let commitInfo: GitCommitInfo | undefined

      const needsUpdate = version !== result.version || sha !== result.sha

      if (needsUpdate) {
        const verStr = `${green(version || 'N/A')} → ${green(result.version)}`
        const shaStr = `${green(sha || 'N/A')} → ${green(result.sha)}`
        this.logger.debug(`🎉 Needs update, version: ${verStr}, sha: ${shaStr}`)

        commitInfo = await this.git.collectCommitInfo(repoPath, result.sha, sha)
      }

      const checkResult: CheckVariantResult = {
        ...result,
        commitInfo,
        needsUpdate,
        variantName: this.name,
        context: this.context,
        variant: this.variant,
      }

      this.logger.debug('Check successful!')
      return checkResult
    }
    catch (error) {
      this.logger.error(red(`Check failed`), error)
    }
  }

  /**
   * 根据类型获取版本信息
   */
  private async checkVersionByType(repoPath: string) {
    if (!this.git) {
      this.logger.warn(yellow('Git service is not initialized, skipping version check'))
      return
    }

    switch (this.type) {
      case 'tag':
        return await this.getVersionFromTag(repoPath)
      case 'sha':
        return await this.getVersionFromSha(repoPath)
      case 'version':
        return await this.getVersionFromFile(repoPath)

      default:
        throw new Error(`Unsupported version check type: ${this.type}`)
    }
  }

  /**
   * 类型为 tag 时获取版本
   */
  private async getVersionFromTag(repoPath: string) {
    const git = this.git!
    const tags = await git.getAllTags(repoPath)
    if (!tags?.length) {
      this.logger.warn(yellow(`No tags found in repository: ${repoPath}`))
      return
    }

    const checkver = this.variant.checkver
    let tag
    if (!checkver.tagPattern) {
      this.logger.debug('No tag pattern specified, will using semver to find a valid tag')
      tag = tags.find(tag => semverValid(tag))
      this.logger.debug(`Found tag: ${tag}`)
      if (!tag) {
        this.logger.warn(yellow('No valid semver tag found, returning empty version'))
      }
    }
    else {
      const pattern = new RegExp(checkver.tagPattern)
      tag = tags.find(t => pattern.test(t))
      if (!tag) {
        this.logger.warn(yellow(`No tags matching pattern "${checkver.tagPattern}" found in repository: ${this.repoName}`))
      }
    }
    if (!tag) {
      return
    }

    const cleanTag = tag.trim()
    const tagSha = await git.getTagSha(repoPath, cleanTag)

    const result = { version: cleanTag.replace(/^v/, ''), sha: tagSha }
    this.logger.debug(`Tag Result: ${green(cleanTag)}, sha: ${green(tagSha)}`)

    return result
  }

  /**
   * 类型为 SHA 时获取版本
   */
  private async getVersionFromSha(repoPath: string) {
    const git = this.git!
    const sha = await git.getSha(repoPath)
    const cleanSha = sha.trim()
    const version = cleanSha.slice(0, 7)

    return { version, sha: cleanSha }
  }

  /**
   * 类型为 version 时获取版本
   */
  private async getVersionFromFile(repoPath: string) {
    const git = this.git
    const checkver = this.variant.checkver
    this.logger.debug(`Getting version from file: ${cyan(checkver.file || 'N/A')}`)

    if (!checkver.file) {
      this.logger.warn(yellow('File path is required for version type check'))
      return
    }

    let version: string | undefined

    if (checkver.file.endsWith('package.json')) {
      version = await this.extractVersionFromPackageJson(repoPath, checkver.file, checkver.regex)
    }
    else if (checkver.regex) {
      version = await this.extractVersionFromFile(repoPath, checkver.file, checkver.regex)
    }
    else {
      const content = await git.readFile(repoPath, checkver.file)
      version = content?.trim()
    }

    // version 可能是带有前缀的，例如 v1.0.0，需要去掉前缀
    version = version && (semverValid(version) || '')
    if (!version) {
      this.logger.error(red(`Invalid version format in ${checkver.file}: ${version}`))
      return
    }

    // FIXME: `git log -G"version"` 当前写死了匹配关键字 version
    const sha = await git.getFileSha(repoPath, checkver.file)

    return { version: version.replace(/^v/, ''), sha: sha?.trim() }
  }

  /**
   * 从 package.json 提取版本
   */
  private async extractVersionFromPackageJson(repoPath: string, filePath: string, regex?: string | RegExp) {
    try {
      const git = this.git!
      const jsonContent = await git.readJson<{ version?: string }>(repoPath, filePath)
      this.logger.debug(`Extracting version from ${filePath}`)

      if (!jsonContent || !jsonContent.version) {
        this.logger.warn(yellow(`Version not found in ${filePath}`))
        return
      }

      if (regex) {
        const pattern = typeof regex === 'string' ? new RegExp(regex) : regex
        const match = jsonContent.version.match(pattern)
        if (!match || !match[1]) {
          this.logger.warn(yellow(`Version pattern not found in ${filePath}`))
          return
        }
        return match[1].trim()
      }
      return jsonContent.version
    }
    catch (error) {
      this.logger.error(red(`Failed to extract version from ${filePath}: ${error}`))
    }
  }

  /**
   * 从文件提取版本（支持正则）
   * - 文件是指对应仓库中的文件
   */
  private async extractVersionFromFile(repoPath: string, filePath: string, regex: string | RegExp) {
    try {
      const git = this.git!
      const content = await git.readFile(repoPath, filePath)
      if (!content) {
        return
      }
      const pattern = typeof regex === 'string' ? new RegExp(regex) : regex
      const match = content.match(pattern)

      if (!match || !match[1]) {
        this.logger.warn(yellow(`Version pattern not found in ${filePath}`))
        return
      }

      return match[1].trim()
    }
    catch (error) {
      this.logger.error(red(`Failed to extract version from ${filePath}: ${error}`))
    }
  }

  /**
   * 补全 `repo` 完整路径
   * - 如果是简写格式 `owner/repo`，则转换为完整的 GitHub URL
   * - 如果是完整的 URL，则直接返回
   */
  private detectRepo(repo: string) {
    return /^https?:\/\//.test(repo) ? repo : `https://github.com/${repo}`
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
}

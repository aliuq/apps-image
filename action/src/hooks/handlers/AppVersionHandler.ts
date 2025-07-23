import type { createPullRequest } from 'octokit-plugin-create-pull-request'
import type { AppMeta, CheckResult, CreatePullRequestOptions, Meta } from '../../types.js'
import path from 'node:path'
import * as core from '@actions/core'
import * as gh from '@actions/github'
import fsa from 'fs-extra'
import { cyan, green, yellow } from 'kolorist'
import { createLoggerNs, escapeHtml, execCommand, formatDate } from '../../utils.js'

export class AppVersionHandler {
  cloneDir = ''
  gitPrefix = ''
  logger: ReturnType<typeof createLoggerNs> = createLoggerNs('AppVersionHandler')

  /**
   * 检查应用版本更新
   * @param meta 应用元数据
   */
  async check(meta: AppMeta): Promise<CheckResult> {
    this.cloneDir = `/tmp/${meta.name}`
    this.gitPrefix = `git -C ${this.cloneDir}`
    this.logger = createLoggerNs(`${meta.name}`, true)

    try {
      this.logger.debug(`Start ${meta.checkVer.type} check`)

      // 统一的仓库克隆操作
      await this.cloneRepository(meta)

      // 根据检查类型获取版本信息
      const versionInfo = await this.getVersionInfo(meta)

      // 检查是否有更新
      const hasUpdate = versionInfo.version !== meta.version || versionInfo.sha !== meta.sha
      if (!hasUpdate) {
        this.logger.info(yellow('No updates found'))
        return { hasUpdate, meta, status: 'success' }
      }

      const newMeta = Object.assign({}, meta, versionInfo)
      await this.logger.debugGroup(`Meta resolved`, async () => core.info(JSON.stringify(newMeta, null, 2)))

      // 生成 PR 数据
      const prData = await this.buildPRData(newMeta, meta)

      // 清理临时目录
      await fsa.remove(this.cloneDir)

      const checkType = meta.checkVer.type
      const type = checkType === 'version' ? 'Version' : checkType === 'tag' ? 'Tag' : 'Commit'
      this.logger.info(`Found new ${cyan(type)} from ${green(meta.version)} → ${green(newMeta.version)}`)

      return {
        hasUpdate,
        meta: newMeta,
        pr: { data: prData },
        status: 'success',
      }
    }
    catch (error) {
      // 确保清理临时目录
      await fsa.remove(this.cloneDir).catch(() => {})

      this.logger.error(`Check failed: ${error}`)
      return {
        hasUpdate: false,
        meta,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * 根据检查类型获取版本信息
   * @param meta 应用元数据
   * @returns 版本信息
   */
  private async getVersionInfo(meta: AppMeta): Promise<{ version: string, sha: string }> {
    switch (meta.checkVer.type) {
      case 'version':
        return await this.getVersionFromFile(meta)
      case 'sha':
        return await this.getVersionFromSha(meta)
      case 'tag':
        return await this.getVersionFromTag(meta)
      default:
        throw new Error(`Unsupported check type: ${meta.checkVer.type}`)
    }
  }

  /**
   * 从版本文件获取版本信息
   */
  private async getVersionFromFile(meta: AppMeta): Promise<{ version: string, sha: string }> {
    if (!meta.checkVer?.file) {
      throw new Error('Version file not specified')
    }

    if (meta.checkVer.file.endsWith('package.json')) {
      const pkgPath = path.join(this.cloneDir, meta.checkVer.file)
      this.logger.debug(`Checking package.json at ${pkgPath}`)

      const pkgContent = await fsa.readJSON(pkgPath)
      const version = pkgContent?.version?.replace(/^v/, '') || meta.version
      const sha = await this.getFileSha(meta.checkVer.file)
      this.logger.debug(`Found version: ${version}, SHA: ${sha}`)

      return { version, sha }
    }
    else {
      // 处理其他类型的版本文件
      const versionFilePath = path.join(this.cloneDir, meta.checkVer.file)
      this.logger.debug(`Checking version file at ${versionFilePath}`)

      if (await fsa.pathExists(versionFilePath)) {
        const versionContent = await fsa.readFile(versionFilePath, 'utf-8')
        let version = ''

        // 如果指定了正则表达式，使用正则提取版本
        if (meta.checkVer.regex) {
          const regex = new RegExp(meta.checkVer.regex)
          const match = versionContent.trim().match(regex)
          // 如果没有匹配到版本，应该直接使用原版本，而不是使用 versionFile 的内容
          if (match && match[1]) {
            version = match[1].trim()
          }
          else {
            this.logger.warning(
              `Regex pattern "${meta.checkVer.regex}" did not match content in ${meta.checkVer.file}`,
            )
            version = meta.version // 回退到原版本
          }
        }

        // 移除可能的 'v' 前缀
        version = version.replace(/^v/, '')
        const sha = await this.getFileSha(meta.checkVer.file)
        this.logger.debug(`Found version: ${version}, SHA: ${sha}`)

        return { version, sha }
      }
    }

    this.logger.debug(
      `Version file ${meta.checkVer.file} not found, using current version ${meta.version} and SHA ${meta.sha}`,
    )

    return { version: meta.version, sha: meta.sha }
  }

  /**
   * 从 SHA 获取版本信息
   */
  private async getVersionFromSha(_meta: AppMeta): Promise<{ version: string, sha: string }> {
    const sha = await execCommand(`git -C ${this.cloneDir} log -1 --format=%H`)
    const version = sha.trim().slice(0, 7) // 使用短 SHA 作为版本号
    this.logger.debug(`Found version from SHA: ${version}, SHA: ${sha.trim()}`)

    return { version, sha: sha.trim() }
  }

  /**
   * 从标签获取版本信息
   */
  private async getVersionFromTag(_meta: AppMeta): Promise<{ version: string, sha: string }> {
    const tag = await execCommand(`git -C ${this.cloneDir} describe --tags --abbrev=0`)
    const sha = await execCommand(`git -C ${this.cloneDir} rev-list -n 1 ${tag}`)
    const version = tag.replace(/^v/, '')
    this.logger.debug(`Found version from tag: ${version}, SHA: ${sha.trim()}`)

    return { version, sha: sha.trim() }
  }

  /**
   * 克隆远程仓库到临时目录，并切换到指定分支或版本
   * @param meta 应用元数据
   */
  private async cloneRepository(meta: AppMeta): Promise<void> {
    // 克隆远程仓库
    if (meta.checkVer?.branch) {
      await execCommand(`git clone -b ${meta.checkVer.branch} ${meta.repo} ${this.cloneDir}`)
    }
    else {
      await execCommand(`git clone ${meta.repo} ${this.cloneDir}`)
    }
    this.logger.debug(`Cloned repository to ${this.cloneDir}`)

    // 如果指定了目标版本，切换到该版本
    if (meta.checkVer?.targetVersion) {
      await execCommand(`git -C ${this.cloneDir} checkout ${meta.checkVer.targetVersion}`)
      this.logger.debug(`Checked out to version ${meta.checkVer.targetVersion}`)
    }
  }

  /**
   * 获取指定文件的最新 SHA
   * @param file 文件路径
   * @returns 文件的最新 SHA
   */
  private async getFileSha(file: string) {
    const pkgSha = await execCommand(`git -C ${this.cloneDir} log -G"version" --format=%H -n 1 -- ${file}`)
    return pkgSha.trim()
  }

  /**
   * 收集提交信息，用于 PR 提交展示
   */
  private async collectCommitInfo(meta: AppMeta, oldMeta: AppMeta) {
    try {
      // 检查是否有变更
      if (meta.sha === oldMeta.sha) {
        return {
          commitMessage: '',
          commitAuthor: '',
          commitDate: '',
          changedFiles: 0,
          additions: 0,
          deletions: 0,
          recentCommits: [],
        }
      }

      // 获取提交信息
      const commitMessage = await execCommand(`${this.gitPrefix} log -1 --format=%s ${meta.sha}`)
      const commitAuthor = await execCommand(`${this.gitPrefix} log -1 --format="%an <%ae>" ${meta.sha}`)
      const commitDate = await execCommand(`${this.gitPrefix} log -1 --format=%ci ${meta.sha}`)

      const diffSha = `${oldMeta.sha}..${meta.sha}`

      // 获取变更统计 - 修复命令和解析
      const changedFilesOutput = await execCommand(`${this.gitPrefix} diff --name-only ${diffSha}`)
      const changedFiles = changedFilesOutput.trim() ? changedFilesOutput.trim().split('\n').length : 0

      // 获取统计信息
      const diffStat = await execCommand(`${this.gitPrefix} diff --shortstat ${diffSha}`)
      let additions = 0
      let deletions = 0

      if (diffStat.trim()) {
        // 解析类似 "5 files changed, 123 insertions(+), 45 deletions(-)" 的输出
        const insertionMatch = diffStat.match(/(\d+) insertions?\(\+\)/)
        const deletionMatch = diffStat.match(/(\d+) deletions?\(-\)/)

        additions = insertionMatch ? Number.parseInt(insertionMatch[1]) : 0
        deletions = deletionMatch ? Number.parseInt(deletionMatch[1]) : 0
      }

      // 获取最近几个提交的简要信息
      const recentCommitsOutput = await execCommand(`${this.gitPrefix} log --oneline ${diffSha}`)
      const recentCommits = recentCommitsOutput.trim()
        ? recentCommitsOutput.trim().split('\n').filter(Boolean).slice(0, 10)
        : []

      const commitInfo = {
        commitMessage: commitMessage.trim(),
        commitAuthor: commitAuthor.trim(),
        commitDate: commitDate.trim(),
        changedFiles,
        additions,
        deletions,
        recentCommits,
      }

      await this.logger.debugGroup('Commit info', async () => core.info(JSON.stringify(commitInfo, null, 2)))

      return commitInfo
    }
    catch (error) {
      this.logger.warning(`Failed to get upstream commit info: ${error}`)
      return {
        commitMessage: '',
        commitAuthor: '',
        commitDate: '',
        changedFiles: 0,
        additions: 0,
        deletions: 0,
        recentCommits: [],
      }
    }
  }

  /**
   * 处理 Dockerfile 内容
   */
  private async resolveDockerfile(meta: AppMeta, oldMeta: AppMeta) {
    const dockerfilePath = path.join(meta.dockerMeta.context, meta.dockerMeta.dockerfile)
    let dockerfileContent = await fsa.readFile(dockerfilePath, 'utf-8')
    const staticDockerfileContent = dockerfileContent
    const hasUpdate = meta.version !== oldMeta.version || meta.sha !== oldMeta.sha
    if (hasUpdate) {
      const versionReg = new RegExp(oldMeta.version, 'g')
      const shaReg = new RegExp(oldMeta.sha.slice(0, 7), 'g')

      dockerfileContent = staticDockerfileContent.replace(versionReg, meta.version)
      dockerfileContent = dockerfileContent.replace(shaReg, meta.sha.slice(0, 7))
    }

    const result = {
      dockerfile: dockerfilePath,
      content: dockerfileContent,
      hasChanged: staticDockerfileContent !== dockerfileContent,
    }

    await this.logger.debugGroup('Dockerfile resolved', async () => {
      core.info(`Dockerfile: ${dockerfilePath}${result.hasChanged ? ' (modified)' : ''}`)
      core.info(`Content:\n${dockerfileContent}`)
    })

    return result
  }

  /**
   * 构建 PR 数据
   * @param meta 应用元数据，更新后的
   */
  private async buildPRData(meta: AppMeta, oldMeta: AppMeta) {
    const ghContext = gh.context
    const createPrMock = core.getBooleanInput('mock')
    const defaultBranch = core.getInput('default_branch') || 'master'

    const branchPrefix = createPrMock ? 'mock/update' : 'update'
    const titlePrefix = createPrMock ? 'mock' : 'chore'

    const prBody = await this.buildPRBody(meta, oldMeta)
    const metaPath = path.join(meta.dockerMeta.context, 'meta.json')

    const prData: CreatePullRequestOptions = {
      owner: ghContext.repo.owner,
      repo: ghContext.repo.repo,
      title: `${titlePrefix}(${meta.dockerMeta.context}): update version to ${meta.version}`,
      head: `${branchPrefix}/${meta.name}-${meta.version}`,
      base: defaultBranch,
      labels: ['automerge'],
      body: prBody,
      changes: [
        {
          files: {
            [metaPath]: {
              content: JSON.stringify(meta, null, 2),
              encoding: 'utf-8',
            },
          },
          commit: `chore(${meta.dockerMeta.context}): update version to ${meta.version}`,
        },
      ],
    }

    const dockerResult = await this.resolveDockerfile(meta, oldMeta)
    if (dockerResult.hasChanged) {
      // @ts-expect-error ignore
      prData.changes[0].files[dockerResult.dockerfile] = { content: dockerResult.content, encoding: 'utf-8' }
    }

    await this.logger.debugGroup('PR Data', async () => core.info(JSON.stringify(prData, null, 2)))

    return prData
  }

  /**
   * 构建 PR 数据
   * @param meta 应用元数据，更新后的
   * @param oldMeta 旧的应用元数据
   */
  private async buildPRBody(meta: AppMeta, oldMeta: AppMeta) {
    const repoName = meta.repo.split('/').pop()?.replace('.git', '') || 'repository'
    const repoUrl = meta.repo.replace('.git', '')

    const oldSha = oldMeta.sha.slice(0, 7)
    const newSha = meta.sha.slice(0, 7)

    const repositoryValue = `[${repoName}](${repoUrl})`
    const versionValue = `\`${oldMeta.version}\` → \`${meta.version}\``
    const revisionValue = `[\`${oldSha}\`](${repoUrl}/commit/${oldMeta.sha}) → [\`${newSha}\`](${repoUrl}/commit/${meta.sha})`

    let body = `## 🚀 Auto-generated PR to update ${meta.name} version to \`${meta.version}\`\n\n`

    // 基本信息
    body += `### 📋 Basic Information\n\n`
    body += `| Key   | Value |\n`
    body += `|-------|-------|\n`
    body += `| **Repository** | ${repositoryValue} |\n`
    body += `| **Version** | ${versionValue} |\n`
    body += `| **Revision** | ${revisionValue} |\n`

    const commitInfo = await this.collectCommitInfo(meta, oldMeta)
    if (commitInfo && commitInfo.commitMessage) {
      body += `| **Latest Commit** | ${escapeHtml(commitInfo.commitMessage)} |\n`
      body += `| **Author** | ${commitInfo.commitAuthor} |\n`
      body += `| **Date** | ${formatDate(commitInfo.commitDate)} |\n`

      // 只有在有实际变更时才显示变更统计
      if (commitInfo.changedFiles > 0) {
        body += `| **Changes** | ${commitInfo.changedFiles} files, +${commitInfo.additions}/-${commitInfo.deletions} |\n`
      }
    }

    body += `\n`

    // 最近提交 - 只有在有提交时才显示
    if (commitInfo?.recentCommits?.length > 0) {
      body += `### 📝 Recent Commits\n\n`

      // 限制显示的提交数量
      commitInfo.recentCommits.forEach((commit: string) => {
        const [sha, ...messageParts] = commit.split(' ')
        const message = messageParts.join(' ').trim()
        body += `- [\`${sha}\`](${repoUrl}/commit/${sha}) ${escapeHtml(message)}\n`
      })

      // 修复比较链接：从 app.sha 到 meta.sha
      const compareUrl = `${repoUrl}/compare/${oldSha}...${newSha}`
      body += `\n[🔗 View full comparison](${compareUrl})\n\n`
    }

    // 自动合并说明
    body += `### ⚡ Auto-merge\n\n`
    body += `This PR is marked for auto-merge and will be automatically merged if all checks pass.\n`

    return body
  }
}

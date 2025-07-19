import type { createPullRequest } from 'octokit-plugin-create-pull-request'
import type { Meta } from '../types.js'
import path from 'node:path'
import * as core from '@actions/core'
import * as gh from '@actions/github'
import fsa from 'fs-extra'
import { cyan, green } from 'kolorist'
import { isDebug } from '../config.js'
import { createLogger, execCommand } from '../utils.js'

export default async function useCheckVersion(app: Meta): Promise<UseCheckVersionReturn> {
  const logger = createLogger(app.name)
  const cloneDir = `/tmp/${app.name}`
  const ghContext = gh.context

  if (app?.branch) {
    await execCommand(`git clone -b ${app.branch} ${app.repo} ${cloneDir}`)
  }
  else {
    await execCommand(`git clone ${app.repo} ${cloneDir}`)
  }

  const meta = Object.assign({}, app)
  const dockerfilePath = path.join(app.dockerMeta.context, app.dockerMeta.dockerfile)
  let dockerfileContent = await fsa.readFile(dockerfilePath, 'utf-8')
  const staticDockerfileContent = dockerfileContent

  const checkVer = app.checkVer
  if (checkVer?.targetVersion) {
    await execCommand(`git -C ${cloneDir} checkout ${checkVer.targetVersion}`)
  }

  if (checkVer.type === 'version') {
    if (checkVer?.file?.endsWith('package.json')) {
      const pkgVersion = (await fsa.readJSON(path.join(cloneDir, checkVer.file)))?.version
      const pkgSha = await execCommand(`git -C ${cloneDir} log -G"version" --format=%H -n 1 -- ${checkVer.file}`)
      const ver = pkgVersion?.replace(/^v/, '')

      if (ver !== app.version) {
        logger(`Found new version from ${green(app.version)} => ${green(ver)}`)
        meta.sha = pkgSha
        meta.version = ver
        dockerfileContent = replaceVersion(dockerfileContent, app.version, meta.version)
      }
      else if (pkgSha !== app.sha) {
        core.warning(`[${app.name}] Same version but Sha value mismatch, please check the file ${checkVer.file}`)
      }
    }
  }
  else if (checkVer.type === 'sha') {
    const sha = await execCommand(`git -C ${cloneDir} log -1 --format=%H`)

    if (sha !== app.sha) {
      logger(`Found new commit from ${green(app.sha)} => ${green(sha)}`)
      meta.sha = sha
      meta.version = sha.slice(0, 7)
      dockerfileContent = replaceVersion(dockerfileContent, app.version, meta.version)
    }
  }
  else if (checkVer.type === 'tag') {
    const tag = await execCommand(`git -C ${cloneDir} describe --tags --abbrev=0`)
    const tagSha = await execCommand(`git -C ${cloneDir} rev-list -n 1 ${tag}`)
    const isStartV = tag.startsWith('v')
    const ver = tag.replace(/^v/, '')

    if (ver !== app.version) {
      logger(`Found new tag from ${app.version} => ${ver}`)
      meta.sha = tagSha
      meta.version = ver

      const needReplaceVer = isStartV ? `v${app.version}` : app.version!
      logger(`Replacing ${needReplaceVer} with ${tag} in ${dockerfilePath}`)
      dockerfileContent = replaceVersion(dockerfileContent, needReplaceVer, tag)
    }
  }

  // 获取更详细的上游提交信息
  const commitInfo = await getUpstreamCommitInfo(cloneDir, app, meta)
  isDebug && await core.group(`[${app.name}] Upstream Commit Info`, async () => core.info(JSON.stringify(commitInfo, null, 2)))

  // Delete the clone directory
  await fsa.remove(cloneDir)

  if (meta.version === app.version) {
    return { hasUpdate: false, meta, dockerfile: dockerfileContent }
  }

  const docker = meta.dockerMeta
  const appShortSha = app.sha.slice(0, 7)
  const metaVer = meta.version
  const metaShortSha = meta.sha.slice(0, 7)

  if (!docker.tags?.length) {
    docker.tags = ['type=raw,value=latest', `type=raw,value=${metaVer}`, `type=raw,value=${metaShortSha}`]
  }
  else {
    docker.tags = docker.tags.map((tag) => {
      app.version && (tag = tag.replace(app.version, metaVer))
      app.sha && (tag = tag.replace(appShortSha, metaShortSha))
      return tag.replace(/\$version/, metaVer).replace(/\$sha/, metaShortSha)
    })
  }
  // Remove duplicates
  docker.tags = Array.from(new Set(docker.tags))

  isDebug && await core.group(`[${app.name}] Metadata`, async () => core.info(JSON.stringify(meta, null, 2)))

  const metaPath = path.join(docker.context, 'meta.json')
  const params: Parameters<ReturnType<typeof createPullRequest>['createPullRequest']>[0] = {
    owner: ghContext.repo.owner,
    repo: ghContext.repo.repo,
    title: `chore(${docker.context}): update version to ${metaVer}`,
    head: `${meta.name}-${metaVer}`,
    base: 'master',
    // body: `Auto-generated PR to update ${meta.name} version to ${metaVer}`,
    body: buildPRBody(meta, metaVer, commitInfo),
    labels: ['automerge'],
    changes: [
      {
        files: {
          [metaPath]: {
            content: JSON.stringify(meta, null, 2),
            encoding: 'utf-8',
          },
        },
        commit: `chore(${meta.name}): update version to ${metaVer}`,
      },
    ],
  }

  if (dockerfileContent.includes(appShortSha)) {
    dockerfileContent = replaceVersion(dockerfileContent, appShortSha, metaShortSha)
  }

  if (staticDockerfileContent !== dockerfileContent) {
    // @ts-expect-error - Should be an array
    params.changes[0].files[docker.dockerfile] = {
      content: dockerfileContent,
      encoding: 'utf-8',
    }
  }

  isDebug && await core.group(`[${app.name}] PR Data`, async () => core.info(JSON.stringify(params, null, 2)))

  return {
    hasUpdate: meta.version !== app.version,
    meta,
    dockerfile: dockerfileContent,
    prData: params,
  }
}

// 添加获取上游提交信息的函数
// eslint-disable-next-line ts/explicit-function-return-type
async function getUpstreamCommitInfo(cloneDir: string, app: Meta, meta: Meta) {
  try {
    // 检查是否有变更
    if (app.sha === meta.sha) {
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
    const commitMessage = await execCommand(`git -C ${cloneDir} log -1 --format=%s ${meta.sha}`)
    const commitAuthor = await execCommand(`git -C ${cloneDir} log -1 --format="%an <%ae>" ${meta.sha}`)
    const commitDate = await execCommand(`git -C ${cloneDir} log -1 --format=%ci ${meta.sha}`)

    // 获取变更统计 - 修复命令和解析
    const changedFilesOutput = await execCommand(`git -C ${cloneDir} diff --name-only ${app.sha}..${meta.sha}`)
    const changedFiles = changedFilesOutput.trim() ? changedFilesOutput.trim().split('\n').length : 0

    // 获取统计信息
    const diffStat = await execCommand(`git -C ${cloneDir} diff --shortstat ${app.sha}..${meta.sha}`)
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
    const recentCommitsOutput = await execCommand(`git -C ${cloneDir} log --oneline ${app.sha}..${meta.sha}`)
    const recentCommits = recentCommitsOutput.trim()
      ? recentCommitsOutput.trim().split('\n').filter(Boolean).slice(0, 10)
      : []

    return {
      commitMessage: commitMessage.trim(),
      commitAuthor: commitAuthor.trim(),
      commitDate: commitDate.trim(),
      changedFiles,
      additions,
      deletions,
      recentCommits,
    }
  }
  catch (error) {
    core.warning(`Failed to get upstream commit info: ${error}`)
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

// 构建 PR body 的函数
// eslint-disable-next-line ts/explicit-function-return-type
function buildPRBody(meta: Meta, metaVer: string, commitInfo: any) {
  const repoName = meta.repo.split('/').pop()?.replace('.git', '') || 'repository'

  let body = `## 🚀 Auto-generated PR to update ${meta.name} version to \`${metaVer}\`\n\n`

  // 基本信息
  body += `### 📋 Basic Information\n\n`
  body += `| Field | Value |\n`
  body += `|-------|-------|\n`
  body += `| **Repository** | [${repoName}](${meta.repo}) |\n`
  body += `| **Version** | \`${meta.version}\` |\n`
  body += `| **Revision** | [\`${meta.sha.slice(0, 7)}\`](${meta.repo.replace('.git', '')}/commit/${meta.sha}) |\n`

  if (commitInfo) {
    body += `| **Latest Commit** | ${commitInfo.commitMessage} |\n`
    body += `| **Author** | ${commitInfo.commitAuthor} |\n`
    body += `| **Date** | ${new Date(commitInfo.commitDate).toLocaleString()} |\n`
    body += `| **Changes** | ${commitInfo.changedFiles} files, +${commitInfo.additions}/-${commitInfo.deletions} |\n`
  }

  body += `\n`

  // 最近提交
  if (commitInfo?.recentCommits?.length > 0) {
    body += `### 📝 Recent Commits\n\n`

    commitInfo.recentCommits.slice(0, 5).forEach((commit: string) => {
      const [sha, ...messageParts] = commit.split(' ')
      const message = messageParts.join(' ')
      body += `- [\`${sha}\`](${meta.repo.replace('.git', '')}/commit/${sha}) ${message}\n`
    })

    if (commitInfo.recentCommits.length > 5) {
      body += `- ... and ${commitInfo.recentCommits.length - 5} more commits\n`
    }

    const compareUrl = `${meta.repo.replace('.git', '')}/compare/${commitInfo.recentCommits[commitInfo.recentCommits.length - 1]?.split(' ')?.[0]}...${commitInfo.recentCommits[0]?.split(' ')?.[0]}`
    body += `\n[🔗 View full comparison](${compareUrl})\n\n`
  }

  // 自动合并说明
  body += `### ⚡ Auto-merge\n\n`
  body += `This PR is marked for auto-merge and will be automatically merged if all checks pass.\n`

  return body
}

function replaceVersion(content: string, oldVersion: string, newVersion: string): string {
  return content.replace(new RegExp(oldVersion, 'g'), newVersion)
}

interface UseCheckVersionReturn {
  /**
   * 是否有更新
   */
  hasUpdate: boolean
  meta: Meta
  dockerfile: string
  prData?: Parameters<ReturnType<typeof createPullRequest>['createPullRequest']>[0]
}

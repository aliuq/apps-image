import type { createPullRequest } from 'octokit-plugin-create-pull-request'
// 检查版本更新
import type { Meta } from '../types'
import path from 'node:path'
import * as core from '@actions/core'
import * as gh from '@actions/github'
import fsa from 'fs-extra'
import { createLogger, execCommand } from '../utils'

export default async function useCheckVersion(app: Meta): Promise<UseCheckVersionReturn> {
  const logger = createLogger(app.name)
  const cloneDir = `/tmp/${app.name}`
  const ghContext = gh.context

  await execCommand(`git clone ${app.repo} ${cloneDir}`)

  const meta = Object.assign({}, app)
  let dockerfile = ''

  const checkVer = app.checkVer
  if (checkVer.type === 'version') {
    if (checkVer?.file?.endsWith('package.json')) {
      const pkgVersion = (await fsa.readJSON(path.join(cloneDir, checkVer.file)))?.version
      const pkgSha = await execCommand(`git -C ${cloneDir} log -G"version" --format=%H -n 1 -- ${checkVer.file}`)
      const ver = pkgVersion?.replace(/^v/, '')

      if (ver !== app.version) {
        logger(`Found new version from ${app.version} => ${ver}`)
        meta.sha = pkgSha
        meta.version = ver
      }
      else if (pkgSha !== app.sha) {
        core.warning(`[${app.name}] Same version but Sha value mismatch, please check the file ${checkVer.file}`)
      }
    }
  }
  else if (checkVer.type === 'sha') {
    const sha = await execCommand(`git -C ${cloneDir} log -1 --format=%H`)

    if (sha !== app.sha) {
      logger(`Found new commit from ${app.sha} => ${sha}`)
      meta.sha = sha
      meta.version = sha.slice(0, 7)
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

      dockerfile = await fsa.readFile(app.dockerMeta.dockerfile, 'utf-8')
      const needReplaceVer = isStartV ? `v${app.version}` : app.version!
      logger(`Replacing ${needReplaceVer} with ${tag} in ${app.dockerMeta.dockerfile}`)
      dockerfile = dockerfile.replace(needReplaceVer, tag)
    }
  }

  // Delete the clone directory
  await fsa.remove(cloneDir)

  if (meta.version === app.version) {
    return { hasUpdate: false, meta, dockerfile }
  }

  const docker = meta.dockerMeta
  const metaVer = meta.version
  const metaShortSha = meta.sha.slice(0, 7)

  if (!docker.tags?.length) {
    docker.tags = ['type=raw,value=latest', `type=raw,value=${metaVer}`, `type=raw,value=${metaShortSha}`]
  }
  else {
    docker.tags = docker.tags.map((tag) => {
      app.version && (tag = tag.replace(app.version, metaVer))
      app.sha && (tag = tag.replace(app.sha.slice(0, 7), metaShortSha))
      return tag.replace(/\$version/, metaVer).replace(/\$sha/, metaShortSha)
    })
  }
  // Remove duplicates
  docker.tags = Array.from(new Set(docker.tags))

  core.group(`[${app.name}] Metadata`, async () => core.info(JSON.stringify(meta, null, 2)))

  const metaPath = path.join(docker.context, 'meta.json')
  const params: Parameters<ReturnType<typeof createPullRequest>['createPullRequest']>[0] = {
    owner: ghContext.repo.owner,
    repo: ghContext.repo.repo,
    title: `chore(${docker.context}): update version to ${metaVer}`,
    head: `${meta.name}-${metaVer}`,
    base: 'master',
    body: `Auto-generated PR to update ${meta.name} version to ${metaVer}`,
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
  if (dockerfile) {
    // @ts-expect-error - Should be an array
    params.changes[0].files[docker.dockerfile] = {
      content: dockerfile,
      encoding: 'utf-8',
    }
  }

  core.group(`[${app.name}] PR Data`, async () => core.info(JSON.stringify(params, null, 2)))

  return {
    hasUpdate: meta.version !== app.version,
    meta,
    dockerfile,
    prData: params,
  }
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

import type { Meta } from '../types'
import path from 'node:path'
import process from 'node:process'
import * as core from '@actions/core'
import * as gh from '@actions/github'
import fg from 'fast-glob'
import fsa from 'fs-extra'
import { cyan, red, yellow } from 'kolorist'
import { createPullRequest } from 'octokit-plugin-create-pull-request'
import { isAct } from '../config'
import useCheckVersion from '../hooks/useCheckVersion'
import { createLogger } from '../utils'

export default async function checkVersion(): Promise<void> {
  try {
    const token = core.getInput('token', { required: true })
    const createPrInput = core.getInput('create_pr', { required: false })

    const enableCreatePr = createPrInput === 'true' || createPrInput === ''

    const apps = await getApps()
    if (!apps.length) {
      core.warning('No apps found')
      core.setOutput('status', 'success')
      return
    }

    // On ACT, set to {}
    const octokit = isAct ? {} : gh.getOctokit(token, {}, createPullRequest as any)
    // @ts-expect-error createPullRequest exists
    const createPR = octokit?.createPullRequest as ReturnType<typeof createPullRequest>['createPullRequest']

    const results: any[] = []
    core.info('Checking for updates...')
    for await (const app of apps) {
      const logger = createLogger(app.name)
      const { hasUpdate, prData } = await useCheckVersion(app)

      if (!hasUpdate) {
        logger(yellow('No updates found'))
        continue
      }
      else {
        results.push(prData)
      }

      // const result = !isAct && enableCreatePr && (await createPR?.(prData!))
      // result && core.info(`PR created: ${result.data.html_url}`)
    }

    await core.group('Results', async () => core.info(JSON.stringify(results, null, 2)))

    core.setOutput('status', 'success')
  }
  catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
    else {
      core.setFailed('An unexpected error occurred')
    }
  }
}

/**
 * 获取所有 apps 目录下的 app 名称和 meta 信息
 */
export async function getApps(): Promise<Meta[]> {
  const metaFiles = await fg.glob('apps/*/meta.json', { cwd: process.cwd() })

  const results = metaFiles.map((metaFile) => {
    const context = path.dirname(metaFile)
    const meta: Meta = fsa.readJsonSync(metaFile)
    const docker = meta.dockerMeta
    const dockerfile = path.join(context, docker?.dockerfile || 'Dockerfile')
    if (!docker || !fsa.existsSync(dockerfile) || meta.skip) {
      return null
    }

    !docker.context && (docker.context = context)
    !docker.dockerfile && (docker.dockerfile = 'Dockerfile')
    !docker.push && (docker.push = false)

    return meta
  }).filter(Boolean)

  const ghContext = gh.context
  const event = ghContext.eventName
  core.info(`Event: ${cyan(event)}`)
  let apps = results
  let app = ''
  if (event === 'workflow_dispatch') {
    app = core.getInput('app', { required: false })
  }
  else if (event === 'push') {
    // 从最新的 commit message 中提取 app 名称
    const commit = ghContext.payload?.head_commit?.message
    core.info(`Commit: ${commit}`)
    app = commit?.match(/chore\(([^)]+)\): force build/)?.[1]
  }

  if (app) {
    core.info(`Checking for spectical app: ${cyan(app)}`)
    const found = results.find(a => a?.name === app)
    if (found) {
      apps = [found]
      core.info(`Checking for spectical context: ${cyan(found.dockerMeta.context)}`)
    }
    else {
      core.setFailed(`No app found for ${red(app)}`)
    }
  }
  else {
    core.info(`Checking for all apps`)
  }

  await core.group(`Meta Files(${metaFiles.length})`, async () => core.info(JSON.stringify(metaFiles, null, 2)))
  await core.group(`Meta(${apps.length}) Resolved`, async () => core.info(JSON.stringify(apps, null, 2)))

  return apps as Meta[]
}

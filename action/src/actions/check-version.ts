import type { Meta } from '../types.js'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import * as core from '@actions/core'
import * as gh from '@actions/github'
import fg from 'fast-glob'
import fsa from 'fs-extra'
import { cyan, green, red, yellow } from 'kolorist'
import { createPullRequest } from 'octokit-plugin-create-pull-request'
import { isAct, isDebug } from '../config.js'
import useCheckVersion from '../hooks/useCheckVersion.js'
import { createLogger, logDebug } from '../utils.js'

export default async function checkVersion(): Promise<void> {
  try {
    const apps = await getApps()
    if (!apps.length) {
      core.warning('No apps found')
      core.setOutput('status', 'success')
      return
    }

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

    if (!results.length) {
      core.info(green('All apps are up to date'))
      core.setOutput('status', 'success')
      return
    }

    core.info(`\nTotal ${green(results.length)} apps updates found`)

    const inputsCreatePr = core.getInput('create_pr', { required: false })
    const createPrMock = core.getInput('mock', { required: false }) === 'true'

    const enableCreatePr = ['', 'true'].includes(inputsCreatePr)
    if (!enableCreatePr && !createPrMock) {
      core.warning(yellow('Skipping PR creation'))
      core.setOutput('status', 'success')
      return
    }

    if (isAct) {
      core.info(yellow('Skipping PR creation in ACT environment'))
      core.setOutput('status', 'success')
      return
    }

    await core.group('Results', async () => core.info(JSON.stringify(results, null, 2)))

    const token = core.getInput('token', { required: true })
    const octokit = gh.getOctokit(token, {}, createPullRequest as any)
    // @ts-expect-error createPullRequest exists
    const createPR = octokit?.createPullRequest as ReturnType<typeof createPullRequest>['createPullRequest']

    for await (const prData of results) {
      const result = await createPR?.(prData!)
      result && core.info(`PR created: ${result.data.html_url}`)
    }

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
  const metaFiles = await fg.glob('apps/*/meta.json')
  isDebug && await core.group(`Meta Files(${metaFiles.length})`, async () => core.info(JSON.stringify(metaFiles, null, 2)))

  const results = metaFiles.map((metaFile) => {
    const context = path.dirname(metaFile)
    const meta: Meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'))
    const docker = meta.dockerMeta
    const dockerfile = path.join(context, docker?.dockerfile || 'Dockerfile')
    if (!docker || !fs.existsSync(dockerfile) || meta.skip) {
      return null
    }

    !docker.context && (docker.context = context)
    !docker.dockerfile && (docker.dockerfile = 'Dockerfile')
    !docker.push && (docker.push = false)

    return meta
  }).filter(Boolean)

  const ghContext = gh.context
  const ghMessage = ghContext.payload?.head_commit?.message || ''
  const event = ghContext.eventName
  logDebug(`Event: ${cyan(event)}`)
  let apps = results
  let app = ''
  if (event === 'workflow_dispatch') {
    app = core.getInput('app', { required: false })
  }
  else if (event === 'push' && ghMessage.includes('force build')) {
    // 优先从修改的文件中提取 app 名称
    const changedFiles = ghContext.payload?.commits?.[0]?.modified || []
    logDebug(`Changed files: ${JSON.stringify(changedFiles)}`)

    // 查找修改的 meta.json 文件
    const modifiedMetaFile = changedFiles.find((file: string) => file.match(/^apps\/[^/]+\/meta\.json$/))

    if (modifiedMetaFile) {
      // 从文件路径提取 app 名称: apps/app-name/meta.json -> app-name
      const appFromPath = modifiedMetaFile.split('/')[1]
      logDebug(`App extracted from modified meta.json: ${cyan(appFromPath)}`)
      app = appFromPath
    }
    else {
      // 回退到从 commit message 中提取
      const commit = ghContext.payload?.head_commit?.message
      logDebug(`Commit: ${commit}`)
      app = commit?.match(/\w+\(([^)]+)\):/)?.[1]
      if (app) {
        logDebug(`App extracted from commit message: ${cyan(app)}`)
      }
    }
  }

  if (app) {
    logDebug(`Checking for spectical app: ${cyan(app)}`)
    const found = results.find(a => a?.name === app)
    if (found) {
      apps = [found]
      logDebug(`Checking for spectical context: ${cyan(found.dockerMeta.context)}`)
    }
    else {
      core.setFailed(`No app found for ${red(app)}`)
    }
  }
  else {
    logDebug(`Checking for all apps`)
  }

  isDebug && await core.group(`Meta(${apps.length}) Resolved`, async () => core.info(JSON.stringify(apps, null, 2)))

  return apps as Meta[]
}

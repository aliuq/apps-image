import type { Meta } from '../types'
import path from 'node:path'
import process from 'node:process'
import * as core from '@actions/core'
import * as gh from '@actions/github'
import fg from 'fast-glob'
import fsa from 'fs-extra'
import { createPullRequest } from 'octokit-plugin-create-pull-request'
import { isAct } from '../config'
import useCheckVersion from '../hooks/useCheckVersion'

export default async function checkVersion(): Promise<void> {
  try {
    const token = core.getInput('token', { required: true })
    const app = core.getInput('app', { required: false })
    const context = core.getInput('context', { required: false })

    const allApps = await getApps()
    let apps = allApps
    if (app) {
      core.info(`Checking for spectical app: ${app}`)
      if (context) {
        const found = allApps.find(a => a.name === app && a.dockerMeta?.context === context)
        if (found) {
          apps = [found]
          core.info(`Checking for spectical context: ${context}`)
        }
        else {
          core.setFailed(`No app found for ${app} with context ${context}`)
        }
      }
      else {
        const found = allApps.find(a => a.name === app)
        if (found) {
          apps = [found]
          core.info(`Checking for spectical context: ${found.dockerMeta.context}`)
        }
        else {
          core.setFailed(`No app found for ${app}`)
        }
      }
    }

    // On ACT, set to {}
    const octokit = isAct ? {} : gh.getOctokit(token, {}, createPullRequest as any)
    // @ts-expect-error createPullRequest exists
    const createPR = octokit?.createPullRequest as ReturnType<typeof createPullRequest>['createPullRequest']
    const createLogger = (prefix: string) => (msg: string) => core.info(`[${prefix}]: ${msg}`)

    for await (const app of apps) {
      const logger = createLogger(app.name)
      const { hasUpdate, prData } = await useCheckVersion(app)

      if (!hasUpdate) {
        logger(`No updates found`)
        continue
      }

      const result = !isAct && (await createPR?.(prData!))
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
  const metaFiles = await fg.glob('apps/*/meta.json', { cwd: process.cwd() })
  core.group(`All Meta Files(${metaFiles.length})`, async () => core.info(JSON.stringify(metaFiles, null, 2)))

  const results = metaFiles
    .map((metaFile) => {
      const context = path.dirname(metaFile)
      const meta: Meta = fsa.readJsonSync(metaFile)
      const docker = meta.dockerMeta
      const dockerfile = path.join(context, docker?.dockerfile || 'Dockerfile')
      if (!docker || !fsa.existsSync(dockerfile) || meta.skip) {
        return null
      }

      !docker.context && (docker.context = context)
      !docker.dockerfile && (docker.dockerfile = dockerfile)
      !docker.push && (docker.push = false)

      return meta
    })
    .filter(Boolean)

  core.group(`All Meta(${results.length})`, async () => core.info(JSON.stringify(results, null, 2)))

  return results as Meta[]
}

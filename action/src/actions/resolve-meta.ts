import type { Meta } from '../types.js'
import path from 'node:path'
import * as core from '@actions/core'
import * as gh from '@actions/github'
import fsa from 'fs-extra'
import { isAct } from '../config.js'
import useCheckVersion from '../hooks/useCheckVersion.js'
import useResolveMeta from '../hooks/useResolveMeta.js'

export default async function resolveMeta(): Promise<void> {
  try {
    const ghContext = gh.context
    const event = ghContext.eventName

    const isPr = event === 'pull_request'

    let context = ''
    if (event === 'pull_request') {
      // chore(apps/weektodo): update version to 2.2.0
      const title = ghContext.payload.pull_request?.title || ''
      context = title.match(/^chore\(([^)]+)\): update version to/)?.[1]
      if (!context) {
        core.info('PR title should be in the format: chore(context): update version to xxx')
        core.setOutput('status', 'failure')
        return
      }
    }
    else if (event === 'workflow_dispatch') {
      context = core.getInput('context', { required: true })
    }

    const metafile = path.join(context, 'meta.json')
    if (!fsa.existsSync(metafile)) {
      core.info(`Meta file not found: ${metafile}`)
      core.setOutput('status', 'failure')
      return
    }

    let meta: Meta = {} as Meta
    if (isAct) {
      if (isPr) {
        const content = ghContext.payload.pull_request?.changes?.[0]?.files?.[metafile]?.content
        fsa.writeFileSync(metafile, content)
        meta = await fsa.readJSON(metafile)
        const docker = meta.dockerMeta
        const dockerfile = path.join(context, docker.dockerfile || 'Dockerfile')

        const dockerfileContent = ghContext.payload.pull_request?.changes?.[0]?.files?.[dockerfile]?.content
        dockerfileContent && fsa.writeFileSync(dockerfile, dockerfileContent)
      }
      else if (event === 'workflow_dispatch') {
        meta = await fsa.readJSON(metafile)
        core.info(`Checking version for ${meta.name}`)
        const { hasUpdate, meta: newMeta, dockerfile: dockerfileContent } = await useCheckVersion(meta)
        if (hasUpdate) {
          fsa.writeFileSync(metafile, JSON.stringify(newMeta, null, 2))
          dockerfileContent && fsa.writeFileSync(meta.dockerMeta.dockerfile, dockerfileContent)
        }
      }
    }
    else {
      meta = await fsa.readJSON(metafile)
      const docker = meta.dockerMeta
      const dockerfile = path.join(context, docker.dockerfile || 'Dockerfile')
      if (!fsa.existsSync(dockerfile)) {
        core.info(`Dockerfile not found: ${dockerfile}`)
        core.setOutput('status', 'failure')
        return
      }
    }

    core.group(`${meta.name} Metadata`, async () => core.info(JSON.stringify(meta, null, 2)))

    const data = await useResolveMeta(meta)

    for (const [key, value] of Object.entries(data)) {
      core.setOutput(key, value)
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

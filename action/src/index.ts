import process from 'node:process'
import * as core from '@actions/core'
import { green } from 'kolorist'
import checkVersion from './actions/check-version.js'
import resolveMeta from './actions/resolve-meta.js'

import { isAct } from './config.js'
import { logDebug } from './utils.js'

async function run(): Promise<void> {
  try {
    // 工作流类型
    const action = core.getInput('action', { required: true })

    logDebug(`Running in ${green(isAct ? 'ACT' : 'GitHub')} environment`)

    if (action === 'check-version') {
      await checkVersion()
    }
    else if (action === 'resolve-meta') {
      await resolveMeta()
    }
    else {
      core.setFailed(`Invalid action: ${action}`)
    }
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

run()

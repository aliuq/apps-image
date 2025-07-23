import type { Action } from './types.js'
import * as core from '@actions/core'
import * as gh from '@actions/github'
import { green } from 'kolorist'
import checkVersion from './actions/check-version.js'

import resolveMeta from './actions/resolve-meta.js'
import { isAct } from './config.js'
import { logDebug } from './utils.js'

async function run() {
  try {
    const action = core.getInput('action', { required: true }) as Action

    logDebug(`Action: ${green(action)}`)
    logDebug(`Event: ${green(gh.context.eventName)}`)
    logDebug(`Environment: ${green(isAct ? 'ACT' : 'GitHub Actions')}`)

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

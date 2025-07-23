import type { createPullRequest } from 'octokit-plugin-create-pull-request'
import type { CheckResult, Meta } from '../types.js'
import path from 'node:path'
import * as core from '@actions/core'
import * as gh from '@actions/github'
import fsa from 'fs-extra'
import { green } from 'kolorist'
import { isDebug } from '../config.js'
import { isAppMeta, isBaseMeta, isSyncMeta } from '../types.js'
import { createLogger, execCommand } from '../utils.js'
import { AppVersionHandler } from './handlers/AppVersionHandler.js'
import { BaseVersionHandler } from './handlers/BaseVersionHandler.js'
import { SyncVersionHandler } from './handlers/SyncVersionHandler.js'

export default async function useCheckVersion(meta: Meta): Promise<CheckResult> {
  try {
    if (isAppMeta(meta)) {
      const handler = new AppVersionHandler()
      return await handler.check(meta)
    }

    if (isBaseMeta(meta)) {
      const handler = new BaseVersionHandler()
      return await handler.check(meta)
    }

    if (isSyncMeta(meta)) {
      const handler = new SyncVersionHandler()
      return await handler.check(meta)
    }

    // @ts-expect-error ignore
    throw new Error(`Unsupported meta type: ${meta.type}`)
  }
  catch (error) {
    return {
      hasUpdate: false,
      meta,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

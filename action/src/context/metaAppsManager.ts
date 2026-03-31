/**
 * 元数据应用管理类
 */
import type { Meta } from '../types/schema.js'
import path from 'node:path'
import process from 'node:process'
import * as core from '@actions/core'
import { yellow } from 'kolorist'
import { eventName, ghContext, resolveMetadataConfig } from '../config.js'
import { pathExists, readJson } from '../file.js'
import { validateAppMeta } from '../lib/validator.js'
import { createLogger } from '../logger.js'
import { MetaAppContext } from './metaAppContext.js'

export class MetaAppsManager {
  private readonly logger = createLogger()

  /**
   * 扫描变更的应用上下文
   * 1. `pull_request`: 从 git 记录中获取变更的文件是否包含 meta.json
   * 2. `pull_request`: 从 PR 标题中获取变更的应用上下文
   * 3. `workflow_dispatch`: context 选项
   * 4. `push`: 从 PR 标题中获取变更的应用上下文
   */
  public async scanChangedContext() {
    try {
      if (eventName === 'workflow_dispatch') {
        const config = resolveMetadataConfig
        if (!config.context) {
          this.logger.warn(yellow('No context provided for workflow_dispatch event, skipping metadata resolution'))
          return
        }
        const variants = config.variants ? config.variants.split(',').map(v => v.trim()) : []
        return { context: config.context, variants }
      }
      else if (eventName === 'pull_request') {
        const message = ghContext.payload.pull_request?.title || ''
        // eslint-disable-next-line e18e/prefer-static-regex
        const regContext = /^update\((.*?)\):/
        // eslint-disable-next-line e18e/prefer-static-regex
        const regVariant = /update (\w+) version to/g

        const context = message.match(regContext)?.[1]?.trim()
        if (!context) {
          this.logger.warn(yellow('No context found in PR title, skipping metadata resolution'))
          return
        }

        // @ts-expect-error ignore
        const variants = Array.from(message.matchAll(regVariant), m => m?.[1]?.trim()).filter(Boolean)

        return { context, variants }
      }
    }
    catch (error) {
      this.logger.error(`Failed to scan changed context: ${error}`)
      core.setFailed('Failed to scan changed context')
    }
  }

  /**
   * 加载单个应用上下文
   *
   * - 验证 `meta.json` 格式
   * - 处理 `skip` 标志
   */
  public async loadAppContext(appPath: string, logger = this.logger) {
    const metaFile = appPath.endsWith('meta.json') ? appPath : path.join(appPath, 'meta.json')
    const context = path.relative(process.cwd(), path.dirname(metaFile))
    if (!pathExists(metaFile)) {
      logger.warn(yellow(`Meta file not found for app at ${appPath}`))
      return
    }

    const meta = await readJson<Meta>(metaFile)
    if (!meta) {
      logger.warn(yellow(`Failed to read meta.json for app at ${appPath}`))
      return
    }

    // 验证 meta 格式
    const valid = await validateAppMeta(meta)
    if (!valid) {
      logger.warn(yellow(`Invalid meta.json in ${context}`))
      return
    }

    // 判断是否 skip
    if (meta.skip) {
      logger.debug(`Skipping app ${context} due to skip flag`)
      core.notice(`Skipping app ${context} due to skip flag`)
      return
    }

    return new MetaAppContext(context, meta)
  }

  /**
   * 生成摘要
   */
  public generateSummary(matrixArray?: any[]) {
    if (!matrixArray?.length) {
      return
    }

    matrixArray.forEach((matrix) => {
      core.summary.addDetails(
        `<strong>Matrix ${matrix.variant}</strong>`,
        `<pre lang="json"><code>${JSON.stringify(matrix, null, 2)}</code></pre>`,
      )
    })
  }
}

/**
 * 解析数据的入口
 */
import core from '@actions/core'
import { yellow } from 'kolorist'
import { resolveMetadataConfig as config, isAct } from './config.js'
import { MetaAppsManager } from './context/metaAppsManager.js'
import { createLogger } from './logger.js'

async function main() {
  const logger = createLogger()
  try {
    isAct && await logger.json(config, 'Inputs')

    // 1. 初始化应用管理生命周期
    const appsManager = new MetaAppsManager()

    // 2. 获取改变的上下文
    const result = await appsManager.scanChangedContext()
    await logger.json(result, 'Changed Contexts')
    if (!result?.context)
      return

    // 2. 加载应用上下文
    const app = await appsManager.loadAppContext(result.context)
    if (!app)
      return

    // 3. 获取 variants
    const variants = app.getChangedVariants(result.variants)
    if (!variants || !Object.keys(variants)?.length)
      return
    await logger.json(variants, 'Changed variants')

    core.summary.addHeading('Resolve Docker Metadata summary', 2)

    // 4. 解析应用元数据
    const matrixArray = await app?.buildMatrixData(variants)
    if (!matrixArray) {
      logger.warn(yellow('No valid matrix data found, skipping metadata resolution.'))
      core.summary.addRaw('⚠️ No valid matrix data found, skipping metadata resolution.')
    }
    else {
      await logger.json({ include: matrixArray }, 'Matrix')
      core.setOutput('matrix', { include: matrixArray })
      appsManager.generateSummary(matrixArray)
    }
    core.summary.write()
  }
  catch (error) {
    if (error instanceof Error) {
      logger.error(`❌ An error occurred during the resolve metadata operation: ${error.message}`)
    }
    else {
      logger.error(`❌ An unexpected error occurred: ${String(error)}`)
    }
  }
}

main()

/**
 * 检查版本更新
 *
 * 触发方式:
 *
 * 1 手动触发: 通过 GitHub Actions 手动触发检查
 * 2 计划任务: 通过 GitHub Actions 定时任务自动触发检查，默认为每小时检查一次
 * 3 Push 推送: 包含有 meta.json 或者 Dockerfile 提交记录的推送会触发检查
 */
import core from '@actions/core'
import { green, yellow } from 'kolorist'
import { checkVersionConfig as config, isAct } from './config.js'
import { CheckAppsManager } from './context/checkAppsManager.js'
import { createLogger } from './logger.js'

async function main() {
  const logger = createLogger()
  try {
    await logger.json(config, 'Inputs')
    core.summary.addHeading('Check Version Results', 2)

    // 1. 初始化应用管理生命周期
    const appsManager = new CheckAppsManager()

    // 2. 扫描应用
    const appPaths = await appsManager.scanApps()
    if (!appPaths?.length) {
      logger.warn(yellow('No applications found to process. Skipping version check.'))
      return
    }

    // 3. 加载应用上下文
    await appsManager.loadApps(appPaths)

    // 5. 执行版本检查
    const { allApps, outdatedApps } = await appsManager.checkAllVersions()

    if (!outdatedApps?.size) {
      logger.info('🎉 All apps are up to date, no updates needed')
      core.summary.addRaw(`\n🎉 Total ${allApps.size} apps are up to date, no updates needed`)
      core.summary.addDetails('Apps', `<pre lang="json"><code>${JSON.stringify(appPaths, null, 2)}</code></pre>`)
    }
    else {
      logger.info(`Total ${green(allApps.size)} apps checked, ${green(outdatedApps.size)} apps needs update`)
    }

    // 6. 构建 PR 数据
    if (config.createPr || isAct) {
      const prResults = await appsManager.buildPrDatas(outdatedApps)
      await logger.json(prResults, 'PR Datas')

      if (config.createPr) {
        const createPrResults = await appsManager.createPr(prResults)
        await logger.json(createPrResults, 'Create PR Results')
        appsManager.generateSummary(outdatedApps, allApps, createPrResults)
      }
    }
    else {
      appsManager.generateSummary(outdatedApps, allApps)
    }

    core.summary.write()
  }
  catch (error) {
    if (error instanceof Error) {
      logger.error(`❌ An error occurred during the version check operation: ${error.message}`)
    }
    else {
      logger.error(`❌ An unexpected error occurred: ${String(error)}`)
    }
  }
}

main()

#!/usr/bin/env bun
// [MISE] description="Run check-version workflow via act"
// [MISE] interactive=true
// [USAGE] flag "-F --force-history" count=#true help="Reuse the latest history entry; repeat twice to skip final confirmation"

/**
 * check-version 任务
 *
 * 通过交互式提示收集参数，然后使用 act 执行 .github/workflows/check-version.yaml
 *
 * 功能：
 * - 支持搜索选择上下文（autocompleteMultiselect）
 * - 支持从历史记录中复用之前执行过的命令
 * - 可选保存执行日志到 .mise-logs/ 目录
 */

import process from 'node:process'
import { autocompleteMultiselect, intro, log, outro, select } from '@clack/prompts'
import { t } from './lib/i18n.mjs'
import {
  assertNotCancel,
  confirmAndRun,
  ensureActAvailable,
  ensureInteractiveTerminal,
  extractInputArg,
  getContextOptions,
  promptHistory,
  promptSaveLog,
} from './lib/utils.mjs'

const TASK_NAME = 'check-version'
const WORKFLOW = '.github/workflows/check-version.yaml'

async function main() {
  const reuseLatestCount = Number(process.env.usage_force_history || 0)
  if (reuseLatestCount <= 1)
    ensureInteractiveTerminal()

  intro(TASK_NAME)
  ensureActAvailable()

  // ── 1. 尝试复用历史命令 ───────────────────────────────────────────────
  const historyEntry = await promptHistory(TASK_NAME, { useLatest: reuseLatestCount > 0 })
  if (historyEntry) {
    const saveLog = reuseLatestCount > 0 ? false : await promptSaveLog()
    // 从历史参数中提取 context 用于日志文件名
    const context = historyEntry.context || extractInputArg(historyEntry.args, 'context') || 'unknown'

    await confirmAndRun({
      task: TASK_NAME,
      cmd: historyEntry.cmd,
      args: historyEntry.args,
      label: historyEntry.label,
      context,
      cwd: historyEntry.cwd,
      saveLog,
      skipConfirm: reuseLatestCount > 1,
    })
    outro(t('task.done'))
    return
  }

  // ── 2. 全新配置流程 ───────────────────────────────────────────────────

  // 2a. 选择检查范围
  const mode = assertNotCancel(await select({
    message: t('check.scope'),
    options: [
      { value: 'all', label: t('check.scopeAll'), hint: t('check.scopeAllHint') },
      { value: 'specific', label: t('check.scopeSpecific'), hint: t('check.scopeSpecificHint') },
    ],
  }))

  let contextValue = 'all'
  if (mode === 'specific') {
    const options = getContextOptions()
    if (options.length === 0) {
      log.error(t('task.noContexts'))
      process.exit(1)
    }

    // 使用 autocompleteMultiselect 支持搜索，解决大量选项时的高度溢出问题
    const contexts = assertNotCancel(await autocompleteMultiselect({
      message: t('check.contexts'),
      options,
      placeholder: t('check.contextsPlaceholder'),
      maxItems: 15,
      required: true,
      validate: value => Array.isArray(value) && value.length > 0 ? undefined : t('check.contextsRequired'),
    }))

    contextValue = contexts.join(',')
  }

  // 2b. 是否创建 PR
  const createPr = assertNotCancel(await select({
    message: t('check.createPr'),
    options: [
      { value: 'false', label: 'No', hint: t('check.createPrNoHint') },
      { value: 'true', label: 'Yes', hint: t('check.createPrYesHint') },
      { value: 'development', label: 'Development', hint: t('check.createPrDevHint') },
    ],
  }))

  // 2c. Debug 模式
  const debug = assertNotCancel(await select({
    message: t('check.debug'),
    options: [
      { value: 'false', label: 'No' },
      { value: 'true', label: 'Yes' },
    ],
  }))

  // 2d. 日志保存
  const saveLog = await promptSaveLog()

  // ── 3. 构建 act 参数 ──────────────────────────────────────────────────
  const args = ['workflow_dispatch', '-W', WORKFLOW]
  args.push('--input', `context=${contextValue}`)
  args.push('--input', `create_pr=${createPr}`)
  args.push('--input', `debug=${debug}`)

  // 可读摘要，用于历史记录展示
  const label = `context=${contextValue} create_pr=${createPr} debug=${debug}`

  // ── 4. 确认并执行 ─────────────────────────────────────────────────────
  await confirmAndRun({
    task: TASK_NAME,
    args,
    label,
    context: contextValue,
    saveLog,
  })

  outro(t('task.done'))
}

main().catch((err) => {
  log.error(err.message)
  process.exit(1)
})

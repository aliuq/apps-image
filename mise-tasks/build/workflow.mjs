#!/usr/bin/env bun
// [MISE] description="Run build workflow locally via act"
// [MISE] interactive=true
// [USAGE] flag "-F --force-history" count=#true help="Reuse the latest history entry; repeat twice to skip final confirmation"

/**
 * build:workflow 任务
 *
 * 通过交互式提示收集参数，然后使用 act 执行 .github/workflows/build-test.yaml
 */

import process from 'node:process'
import { autocomplete, autocompleteMultiselect, intro, log, outro, select } from '@clack/prompts'
import { t } from '../lib/i18n.mjs'
import {
  assertNotCancel,
  confirmAndRun,
  ensureActAvailable,
  ensureInteractiveTerminal,
  extractInputArg,
  getContextOptions,
  getVariantOptions,
  promptHistory,
  promptSaveLog,
} from '../lib/utils.mjs'

const TASK_NAME = 'build:workflow'
const WORKFLOW = '.github/workflows/build-test.yaml'

async function main() {
  const reuseLatestCount = Number(process.env.usage_force_history || 0)
  if (reuseLatestCount <= 1)
    ensureInteractiveTerminal()

  intro(TASK_NAME)
  ensureActAvailable()

  const historyEntry = await promptHistory(TASK_NAME, {
    useLatest: reuseLatestCount > 0,
    aliases: ['build-test', 'build-workflow'],
  })

  if (historyEntry) {
    const saveLog = reuseLatestCount > 0 ? false : await promptSaveLog()
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

  const options = getContextOptions()
  if (options.length === 0) {
    log.error(t('task.noContexts'))
    process.exit(1)
  }

  const context = assertNotCancel(await autocomplete({
    message: t('build.workflow.context'),
    options,
    placeholder: t('check.contextsPlaceholder'),
  }))

  const { options: variantOptions, initialValues, hasSelectableOptions } = getVariantOptions(context)
  let variantsValue = 'latest'

  if (variantOptions.length === 0 || !hasSelectableOptions) {
    log.warn(t('build.workflow.noEnabledVariants', { context }))
  }
  else {
    const variants = assertNotCancel(await autocompleteMultiselect({
      message: t('build.workflow.variant'),
      options: variantOptions,
      placeholder: t('build.workflow.variantPlaceholder'),
      maxItems: 10,
      initialValues,
      required: false,
    }))

    if (variants.length === 0) {
      log.warn(t('build.workflow.noVariantsSelected'))
    }
    else {
      variantsValue = variants.join(',')
    }
  }

  const debug = assertNotCancel(await select({
    message: t('build.workflow.debug'),
    options: [
      { value: 'false', label: 'No' },
      { value: 'true', label: 'Yes' },
    ],
  }))

  const build = assertNotCancel(await select({
    message: t('build.workflow.buildImage'),
    options: [
      { value: 'true', label: 'Yes', hint: t('build.workflow.buildImageHint') },
      { value: 'false', label: 'No', hint: t('build.workflow.skipBuildHint') },
    ],
  }))

  const notify = assertNotCancel(await select({
    message: t('build.workflow.notify'),
    initialValue: 'false',
    options: [
      { value: 'true', label: 'Yes' },
      { value: 'false', label: 'No' },
    ],
  }))

  const saveLog = await promptSaveLog()
  const args = ['workflow_dispatch', '-W', WORKFLOW]
  args.push('--input', `context=${context}`)
  args.push('--input', `variants=${variantsValue}`)
  args.push('--input', `debug=${debug}`)
  args.push('--input', `build=${build}`)
  args.push('--input', `notify=${notify}`)

  const label = `context=${context} variants=${variantsValue} debug=${debug} build=${build}`

  await confirmAndRun({
    task: TASK_NAME,
    args,
    label,
    context,
    saveLog,
  })

  outro(t('task.done'))
}

main().catch((err) => {
  log.error(err.message)
  process.exit(1)
})

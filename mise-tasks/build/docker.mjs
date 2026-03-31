#!/usr/bin/env bun
// [MISE] description="Run local docker buildx build"
// [MISE] interactive=true
// [USAGE] flag "-F --force-history" count=#true help="Reuse the latest history entry; repeat twice to skip final confirmation"
// [USAGE] flag "--plain-progress" help="Enable --progress=plain for docker buildx build"

/**
 * build:docker 任务
 *
 * 通过交互式提示收集参数，然后直接执行本地 docker buildx build 命令
 */

import { readdirSync } from 'node:fs'
import process from 'node:process'
import { autocomplete, intro, log, outro, select, text, note } from '@clack/prompts'
import { t } from '../lib/i18n.mjs'
import {
  assertNotCancel,
  confirmAndRun,
  ensureDockerBuildxAvailable,
  ensureInteractiveTerminal,
  getContextOptions,
  isUsageFlagEnabled,
  promptHistory,
  promptSaveLog,
} from '../lib/utils.mjs'

const TASK_NAME = 'build:docker'

function hasDockerfile(context) {
  try {
    return readdirSync(context, { withFileTypes: true })
      .some(entry => entry.isFile() && (entry.name === 'Dockerfile' || entry.name.startsWith('Dockerfile.')))
  }
  catch {
    return false
  }
}

function getDockerfileOptions(context) {
  return readdirSync(context, { withFileTypes: true })
    .filter(entry => entry.isFile() && (entry.name === 'Dockerfile' || entry.name.startsWith('Dockerfile.')))
    .map(entry => entry.name)
    .sort((left, right) => {
      if (left === 'Dockerfile')
        return -1
      if (right === 'Dockerfile')
        return 1
      return left.localeCompare(right)
    })
    .map(file => ({
      value: file,
      label: file,
      hint: file === 'Dockerfile'
        ? t('build.docker.fileDefault')
        : t('build.docker.fileVariant', { variant: file.replace('Dockerfile.', '') }),
    }))
}

function getDefaultTag(context, dockerfile) {
  const name = context.split('/').at(-1)
  if (dockerfile === 'Dockerfile')
    return `${name}:local`

  const suffix = dockerfile.replace(/^Dockerfile\./, '')
  return `${name}:local-${suffix}`
}

async function main() {
  const reuseLatestCount = Number(process.env.usage_force_history || 0)
  if (reuseLatestCount <= 1)
    ensureInteractiveTerminal()

  intro(TASK_NAME)
  ensureDockerBuildxAvailable()

  const historyEntry = await promptHistory(TASK_NAME, {
    useLatest: reuseLatestCount > 0,
    aliases: ['build-local', 'build-docker'],
  })

  if (historyEntry) {
    const context = historyEntry.context || historyEntry.cwd || 'unknown'

    await confirmAndRun({
      task: TASK_NAME,
      cmd: historyEntry.cmd,
      args: historyEntry.args,
      label: historyEntry.label,
      context,
      cwd: historyEntry.cwd,
      saveLog: reuseLatestCount > 0 ? false : await promptSaveLog(),
      skipConfirm: reuseLatestCount > 1,
    })
    const name = context.split('/').at(-1)
    const tag = historyEntry.label.match(/tag=([^ ]+)/)?.[1]
    if (tag) {
      note(`docker run --rm --name ${name} ${tag}`, 'Next step')
    }
    outro(t('task.done'))
    return
  }

  const options = getContextOptions().filter(option => hasDockerfile(option.value))
  if (options.length === 0) {
    log.error(t('build.docker.noContexts'))
    process.exit(1)
  }

  const context = assertNotCancel(await autocomplete({
    message: t('build.docker.context'),
    options,
    placeholder: t('check.contextsPlaceholder'),
  }))

  const dockerfileOptions = getDockerfileOptions(context)
  const dockerfile = assertNotCancel(await select({
    message: t('build.docker.file'),
    options: dockerfileOptions,
  }))

  const tag = assertNotCancel(await text({
    message: t('build.docker.tag'),
    initialValue: getDefaultTag(context, dockerfile),
    placeholder: t('build.docker.tagPlaceholder'),
    validate: value => value?.trim() ? undefined : t('build.docker.tagRequired'),
  }))
  const trimmedTag = tag.trim()

  const plainProgress = isUsageFlagEnabled(process.env.usage_plain_progress)
    ? true
    : assertNotCancel(await select({
        message: t('build.docker.progress'),
        options: [
          { value: false, label: t('build.docker.progressAuto'), hint: t('build.docker.progressAutoHint') },
          { value: true, label: t('build.docker.progressPlain'), hint: t('build.docker.progressPlainHint') },
        ],
      }))

  const saveLog = await promptSaveLog()
  const args = ['buildx', 'build']

  if (plainProgress)
    args.push('--progress=plain')

  args.push('-f', `./${dockerfile}`, '-t', trimmedTag, '--load', '.')

  const progressLabel = plainProgress ? 'plain' : 'auto'
  const label = `context=${context} file=${dockerfile} tag=${trimmedTag} progress=${progressLabel}`

  await confirmAndRun({
    task: TASK_NAME,
    cmd: 'docker',
    args,
    label,
    context,
    cwd: context,
    saveLog,
  })

  const name = context.split('/').at(-1)
  note(`docker run --rm --name ${name} ${trimmedTag}`, 'docker run')

  outro(t('task.done'))
}

main().catch((err) => {
  log.error(err.message)
  process.exit(1)
})

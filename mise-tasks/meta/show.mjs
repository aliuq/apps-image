#!/usr/bin/env bun
// [MISE] description="Show resolved meta.json with action defaults"
// [MISE] interactive=true
// [USAGE] flag "-F --force-history" count=#true help="Reuse the latest history entry; repeat twice to skip final confirmation"

/**
 * meta:show 任务
 *
 * 读取某个 app 的 meta.json，并通过 action 中的默认值规则补全后输出。
 */

import { execFileSync } from 'node:child_process'
import process from 'node:process'
import { autocomplete, confirm, intro, log, note, outro } from '@clack/prompts'
import { MetaAppsManager } from '../../action/src/context/metaAppsManager.ts'
import { t } from '../lib/i18n.mjs'
import { assertNotCancel, ensureInteractiveTerminal, getContextOptions, promptHistory, saveHistory } from '../lib/utils.mjs'

const TASK_NAME = 'meta:show'

function toDisplayMeta(meta) {
  return {
    name: meta.name,
    type: meta.type,
    title: meta.title ?? null,
    slogan: meta.slogan ?? null,
    description: meta.description ?? null,
    license: meta.license ?? null,
    context: meta.context ?? null,
    readme: meta.readme ?? null,
    skip: meta.skip ?? null,
    variants: Object.fromEntries(Object.entries(meta.variants).map(([variantName, variant]) => {
      return [variantName, {
        version: variant.version ?? null,
        sha: variant.sha ?? null,
        enabled: variant.enabled ?? null,
        checkver: {
          type: variant.checkver.type,
          repo: variant.checkver.repo ?? null,
          branch: variant.checkver.branch ?? null,
          file: variant.checkver.file ?? null,
          path: variant.checkver.path ?? null,
          regex: variant.checkver.regex ?? null,
          tagPattern: variant.checkver.tagPattern ?? null,
          targetVersion: variant.checkver.targetVersion ?? null,
          processFiles: variant.checkver.processFiles ?? [],
          lastCheck: variant.checkver.lastCheck ?? null,
        },
        docker: {
          file: variant.docker?.file ?? null,
          images: variant.docker?.images ?? [],
          tags: variant.docker?.tags ?? [],
          platforms: variant.docker?.platforms ?? [],
          labels: variant.docker?.labels ?? {},
          buildArgs: variant.docker?.buildArgs ?? {},
          secrets: variant.docker?.secrets ?? [],
          outputs: variant.docker?.outputs ?? [],
          cache: {
            from: variant.docker?.cache?.from ?? [],
            to: variant.docker?.cache?.to ?? [],
          },
          push: variant.docker?.push ?? null,
          load: variant.docker?.load ?? null,
        },
      }]
    })),
  }
}

function formatJsonOutput(value) {
  const json = JSON.stringify(value, null, 2)

  try {
    return execFileSync('jq', ['-C', '.'], {
      input: json,
      encoding: 'utf8',
    })
  }
  catch {
    return `${json}\n`
  }
}

async function confirmDisplay(context, skipConfirm) {
  note(`context=${context}`, t('task.command'))

  if (skipConfirm)
    return

  const shouldRun = assertNotCancel(await confirm({
    message: t('task.execute'),
    initialValue: true,
  }))

  if (!shouldRun) {
    log.warn(t('task.aborted'))
    process.exit(0)
  }
}

async function main() {
  const reuseLatestCount = Number(process.env.usage_force_history || 0)
  if (reuseLatestCount <= 1)
    ensureInteractiveTerminal()

  intro(TASK_NAME)

  const historyEntry = await promptHistory(TASK_NAME, {
    useLatest: reuseLatestCount > 0,
  })

  const options = getContextOptions()
  if (options.length === 0) {
    log.error(t('task.noContexts'))
    process.exit(1)
  }

  const context = historyEntry?.context || assertNotCancel(await autocomplete({
    message: t('meta.show.context'),
    options,
    placeholder: t('check.contextsPlaceholder'),
  }))

  await confirmDisplay(context, reuseLatestCount > 1)

  const manager = new MetaAppsManager()
  const app = await manager.loadAppContext(context)

  if (!app) {
    log.error(t('meta.show.invalid', { context }))
    process.exit(1)
  }

  const resolvedMeta = app.getResolvedMeta()
  const displayMeta = toDisplayMeta(resolvedMeta)
  const summary = [
    `context: ${displayMeta.context}`,
    `name: ${displayMeta.name}`,
    `variants: ${Object.keys(displayMeta.variants).join(', ')}`,
  ].join('\n')

  saveHistory(TASK_NAME, {
    cmd: TASK_NAME,
    args: [`context=${context}`],
    label: `context=${context}`,
    context,
  })

  note(summary, t('meta.show.pretty'))
  process.stdout.write(formatJsonOutput(displayMeta))
  outro(t('task.done'))
}

main().catch((err) => {
  log.error(err.message)
  process.exit(1)
})

/* eslint-disable no-console */
/**
 * mise-tasks 共享工具模块
 *
 * 提供命令历史缓存、日志保存、上下文扫描、进程执行等公共能力
 * 供 check-version / build:* 等 file task 复用
 */

import { execSync, spawn } from 'node:child_process'
import { createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { cancel, confirm, isCancel, isCI, isTTY, log, note, select } from '@clack/prompts'
import { t } from './i18n.mjs'

// ─── 常量 ───────────────────────────────────────────────────────────────────

/** 上下文目录列表 */
const CONTEXT_DIRS = ['apps', 'base', 'test']

/** 日志 & 历史记录存放目录 */
const DATA_DIR = '.mise-logs'

/** 历史记录文件路径 */
const HISTORY_FILE = join(DATA_DIR, 'history.json')

/** 单个任务最多保留的历史记录条数 */
const MAX_HISTORY = 20

// ─── 类型 ───────────────────────────────────────────────────────────────────

/**
 * @typedef {object} HistoryEntry
 * @property {string}   task      - 任务名称，如 check-version / build-test
 * @property {string}   [cmd]     - 可执行命令，如 act / docker
 * @property {string[]} args      - 传递给 act 的完整参数数组
 * @property {string}   [cwd]     - 命令执行目录
 * @property {string}   [context] - 逻辑上下文（用于日志命名）
 * @property {string}   label     - 用于展示的可读摘要
 * @property {string}   timestamp - ISO 格式时间戳
 */

// ─── 取消断言 ────────────────────────────────────────────────────────────────

/**
 * 检测用户是否按下 Ctrl+C 取消操作，是则优雅退出
 * @template T
 * @param {T | symbol} value - clack prompt 返回值
 * @returns {T} 返回未取消的 prompt 值。
 */
export function assertNotCancel(value) {
  if (isCancel(value)) {
    cancel('Operation cancelled')
    process.exit(0)
  }
  return value
}

// ─── 上下文扫描 ──────────────────────────────────────────────────────────────

/**
 * 扫描 apps / base / test 下的所有子目录，返回扁平 option 列表
 * 适配 `autocomplete` / `autocompleteMultiselect` / `select` 等组件
 * @returns {{ value: string, label: string, hint?: string }[]} 返回可用于 prompt 的上下文选项列表。
 */
export function getContextOptions() {
  const options = []
  for (const dir of CONTEXT_DIRS) {
    if (!existsSync(dir))
      continue
    const entries = readdirSync(dir, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => ({
        value: `${dir}/${e.name}`,
        label: `${dir}/${e.name}`,
        hint: dir,
      }))
    options.push(...entries)
  }
  return options
}

/**
 * 从指定 context 的 meta.json 中读取 variants 选项
 *
 * - 默认预选 latest
 *
 * @param {string} context
 * @returns {{ options: { value: string, label: string, hint?: string, disabled?: boolean }[], initialValues: string[], hasSelectableOptions: boolean }} 返回变体选项、默认值以及是否存在可选项。
 */
export function getVariantOptions(context) {
  const metaPath = join(context, 'meta.json')
  if (!existsSync(metaPath)) {
    return { options: [], initialValues: [], hasSelectableOptions: false }
  }

  try {
    const raw = readFileSync(metaPath, 'utf-8')
    const meta = JSON.parse(raw)
    const variants = meta?.variants
    if (!variants || typeof variants !== 'object') {
      return { options: [], initialValues: [], hasSelectableOptions: false }
    }

    const entries = Object.entries(variants)
    const selectableVariants = entries
      .filter(([, variant]) => variant?.enabled !== false)
      .map(([name]) => name)

    const options = entries.map(([name, variant]) => ({
      value: name,
      label: name,
      hint: variant?.enabled === false ? 'disabled' : undefined,
      disabled: variant?.enabled === false,
    }))

    const initialValues = selectableVariants.includes('latest')
      ? ['latest']
      : selectableVariants.slice(0, 1)

    return { options, initialValues, hasSelectableOptions: selectableVariants.length > 0 }
  }
  catch {
    return { options: [], initialValues: [], hasSelectableOptions: false }
  }
}

// ─── 历史记录 ────────────────────────────────────────────────────────────────

/** 确保 DATA_DIR 存在 */
function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true })
  }
}

/**
 * 读取全部历史记录
 * @returns {HistoryEntry[]} 返回当前历史记录文件中的有效条目。
 */
function readHistory() {
  try {
    if (existsSync(HISTORY_FILE)) {
      const raw = readFileSync(HISTORY_FILE, 'utf-8')
      const data = JSON.parse(raw)
      if (Array.isArray(data)) {
        return data
          .filter(item => item && typeof item === 'object' && item.task && Array.isArray(item.args))
          .map(item => ({
            task: item.task,
            cmd: typeof item.cmd === 'string' && item.cmd.length > 0 ? item.cmd : 'act',
            args: item.args,
            cwd: typeof item.cwd === 'string' && item.cwd.length > 0 ? item.cwd : undefined,
            context: typeof item.context === 'string' && item.context.length > 0 ? item.context : undefined,
            label: typeof item.label === 'string' && item.label.length > 0 ? item.label : item.args.join(' '),
            timestamp: typeof item.timestamp === 'string' && item.timestamp.length > 0 ? item.timestamp : new Date().toISOString(),
          }))
      }
    }
  }
  catch {
    // 文件损坏时静默忽略，返回空数组
  }
  return []
}

/**
 * 保存一条新的历史记录
 * 同一任务最多保留 MAX_HISTORY 条，按时间倒序
 * @returns {void} 该函数仅写入历史记录文件，不返回值。
 */
export function saveHistory(task, { cmd = 'act', args, label, cwd, context }) {
  ensureDataDir()
  const all = readHistory()
  const entry = {
    task,
    cmd,
    args,
    cwd,
    context,
    label,
    timestamp: new Date().toISOString(),
  }
  all.unshift(entry)

  // 按任务分组限制数量
  const counts = {}
  const trimmed = all.filter((e) => {
    counts[e.task] = (counts[e.task] || 0) + 1
    return counts[e.task] <= MAX_HISTORY
  })

  writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2))
}

/**
 * 获取指定任务的历史记录（按时间倒序）
 * @param {string} task
 * @returns {HistoryEntry[]} 返回指定任务的历史记录列表。
 */
export function getHistory(task, aliases = []) {
  const taskNames = new Set([task, ...aliases])
  return readHistory().filter(e => taskNames.has(e.task))
}

/**
 * 从 act 参数中提取 workflow_dispatch input 值
 *
 * @param {string[]} args
 * @param {string} key
 * @returns {string | undefined} 返回指定 input 的值，未找到时返回 undefined。
 */
export function extractInputArg(args, key) {
  return args.find((arg, index) => index > 0 && args[index - 1] === '--input' && arg.startsWith(`${key}=`))?.slice(key.length + 1)
}

/**
 * 交互式选择是否复用历史命令
 * 返回选中的历史记录或 null（表示用户选择新建）
 *
 * @param {string} task - 任务名称
 * @param {{ useLatest?: boolean, aliases?: string[] }} [options]
 * @returns {Promise<HistoryEntry | null>} 返回选中的历史记录，或在新建配置时返回 null。
 */
export async function promptHistory(task, options = {}) {
  const { useLatest = false, aliases = [] } = options
  const history = getHistory(task, aliases)

  if (useLatest) {
    if (history.length === 0) {
      log.error(t('task.noHistory', { task }))
      process.exit(1)
    }
    return history[0]
  }

  if (history.length === 0)
    return null

  const mode = assertNotCancel(await select({
    message: t('task.historyProceed'),
    options: [
      { value: 'new', label: t('task.historyNew'), hint: t('task.historyNewHint') },
      { value: 'history', label: t('task.historyFrom'), hint: t('task.historyFromHint', { count: history.length }) },
    ],
  }))

  if (mode === 'new')
    return null

  // 展示历史列表
  const entry = assertNotCancel(await select({
    message: t('task.historySelect'),
    options: history.map((e, i) => ({
      value: i,
      label: e.label,
      hint: new Date(e.timestamp).toLocaleString(),
    })),
  }))

  return history[entry]
}

// ─── 日志 ────────────────────────────────────────────────────────────────────

/**
 * 询问用户是否保存日志
 * @returns {Promise<boolean>} 返回用户是否选择保存日志。
 */
export async function promptSaveLog() {
  return assertNotCancel(await confirm({
    message: t('task.logSave'),
    initialValue: false,
  }))
}

export function ensureInteractiveTerminal() {
  if (!process.stdin.isTTY || !isTTY(process.stdout) || isCI()) {
    log.error(t('task.interactiveRequired'))
    log.info(t('task.interactiveRequiredHint'))
    process.exit(1)
  }
}

export function isUsageFlagEnabled(value) {
  return !['', '0', 'false', 'undefined'].includes(String(value ?? '').toLowerCase())
}

/**
 * 生成友好的日志文件路径
 * 格式: .mise-logs/{task}-{context}-{YYYY-MM-DD_HH-mm-ss}.log
 *
 * @param {string} task    - 任务名
 * @param {string} context - 上下文标识（如 apps/icones）
 * @returns {string} 返回生成的日志文件路径。
 */
export function getLogPath(task, context) {
  ensureDataDir()
  const now = new Date()
  const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
  // 将 / 替换为 _ 以避免路径问题
  const safeCtx = context.replace(/\//g, '_').replace(/,/g, '+')
  return join(DATA_DIR, `${task}-${safeCtx}-${ts}.log`)
}

// ─── 进程执行 ────────────────────────────────────────────────────────────────

/**
 * 执行外部命令
 *
 * 当 logFile 指定时，stdout/stderr 会同时写入终端和日志文件（tee 模式）
 *
 * @param {string}      cmd     - 可执行文件名
 * @param {string[]}    args    - 参数列表
 * @param {string|null} logFile - 如果非 null，将输出 tee 到该文件
 * @param {string}      [cwd]   - 命令执行目录
 * @returns {Promise<number>} 返回命令退出码。
 */
export function exec(cmd, args, logFile = null, cwd = undefined) {
  return new Promise((resolve) => {
    let settled = false
    const finish = (code = 1) => {
      if (settled)
        return
      settled = true
      resolve(code ?? 1)
    }

    if (logFile) {
      // tee 模式：通过 pipe 手动将输出同时写到终端和文件
      const stream = createWriteStream(logFile, { flags: 'a' })
      let streamHealthy = true
      const proc = spawn(cmd, args, { cwd, stdio: ['inherit', 'pipe', 'pipe'] })

      stream.on('error', (error) => {
        streamHealthy = false
        log.warn(t('task.logWriteFailed', { path: logFile, error: error.message }))
      })

      const writeToLog = (data) => {
        if (streamHealthy)
          stream.write(data)
      }

      proc.stdout.on('data', (data) => {
        process.stdout.write(data)
        writeToLog(data)
      })
      proc.stderr.on('data', (data) => {
        process.stderr.write(data)
        writeToLog(data)
      })
      proc.on('error', (error) => {
        stream.end()
        log.error(t('task.commandSpawnFailed', { cmd, error: error.message }))
        finish(1)
      })
      proc.on('close', (code) => {
        stream.end()
        finish(code ?? 1)
      })
    }
    else {
      const proc = spawn(cmd, args, { cwd, stdio: 'inherit' })
      proc.on('error', (error) => {
        log.error(t('task.commandSpawnFailed', { cmd, error: error.message }))
        finish(1)
      })
      proc.on('close', code => finish(code ?? 1))
    }
  })
}

// ─── 环境检查 ────────────────────────────────────────────────────────────────

/**
 * 检查 act 是否在 PATH 中可用
 * 不可用时打印提示并退出
 */
export function ensureActAvailable() {
  try {
    execSync('act --version', { stdio: 'ignore' })
  }
  catch {
    log.error(t('task.actMissing'))
    log.info(t('task.actInstall'))
    process.exit(1)
  }
}

/**
 * 检查 docker buildx 是否可用
 * @returns {void} 该函数仅做环境校验，不返回值。
 */
export function ensureDockerBuildxAvailable() {
  try {
    execSync('docker buildx version', { stdio: 'ignore' })
  }
  catch {
    log.error(t('task.buildxMissing'))
    process.exit(1)
  }
}

// ─── 通用确认执行 ────────────────────────────────────────────────────────────

/**
 * 显示即将执行的命令并确认 → 执行 → 保存历史 / 写日志
 *
 * @param {object}   opts
 * @param {string}   opts.task         - 任务名称
 * @param {string}   [opts.cmd]        - 执行命令，默认 act
 * @param {string[]} opts.args         - 命令参数
 * @param {string}   opts.label        - 历史记录可读摘要
 * @param {string}   opts.context      - 上下文标识（用于日志文件名）
 * @param {boolean}  opts.saveLog      - 是否保存日志
 * @param {string}   [opts.cwd]        - 命令执行目录
 * @param {boolean}  [opts.skipConfirm] - 是否跳过执行确认
 * @returns {Promise<void>} 在命令执行完成后返回，无显式返回值。
 */
export async function confirmAndRun({ task, cmd = 'act', args, label, context, saveLog, cwd, skipConfirm = false }) {
  const commandText = cwd
    ? `cd ${cwd} && ${cmd} ${args.join(' ')}`
    : `${cmd} ${args.join(' ')}`

  note(commandText, t('task.command'))

  if (!skipConfirm) {
    const shouldRun = assertNotCancel(await confirm({
      message: t('task.execute'),
      initialValue: true,
    }))

    if (!shouldRun) {
      cancel(t('task.aborted'))
      process.exit(0)
    }
  }

  // 保存到历史
  saveHistory(task, { cmd, args, label, cwd, context })

  // 日志文件
  const logFile = saveLog ? getLogPath(task, context) : null
  if (logFile) {
    log.info(t('task.logWillSave', { path: logFile }))
  }

  log.step(cmd === 'act' ? t('task.workflowExecuting') : t('task.commandExecuting'))
  console.log()

  const exitCode = await exec(cmd, args, logFile, cwd)

  console.log()
  if (exitCode !== 0) {
    log.error(cmd === 'act'
      ? t('task.workflowExit', { code: exitCode })
      : t('task.commandExit', { code: exitCode }))
    if (logFile)
      log.info(t('task.logCheck', { path: logFile }))
    process.exit(exitCode)
  }

  if (logFile)
    log.success(t('task.logSaved', { path: logFile }))
}

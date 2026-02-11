/* eslint-disable no-console */
/**
 * mise-tasks 共享工具模块
 *
 * 提供命令历史缓存、日志保存、上下文扫描、进程执行等公共能力
 * 供 check-version / build-test 等 file task 复用
 */

import { execSync, spawn } from 'node:child_process'
import { createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import {
  cancel,
  confirm,
  isCancel,
  log,
  note,
  select,
} from '@clack/prompts'

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
 * @property {string[]} args      - 传递给 act 的完整参数数组
 * @property {string}   label     - 用于展示的可读摘要
 * @property {string}   timestamp - ISO 格式时间戳
 */

// ─── 取消断言 ────────────────────────────────────────────────────────────────

/**
 * 检测用户是否按下 Ctrl+C 取消操作，是则优雅退出
 * @template T
 * @param {T | symbol} value - clack prompt 返回值
 * @returns {T}
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

// ─── 历史记录 ────────────────────────────────────────────────────────────────

/** 确保 DATA_DIR 存在 */
function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true })
  }
}

/**
 * 读取全部历史记录
 * @returns {HistoryEntry[]}
 */
function readHistory() {
  try {
    if (existsSync(HISTORY_FILE)) {
      const raw = readFileSync(HISTORY_FILE, 'utf-8')
      const data = JSON.parse(raw)
      if (Array.isArray(data))
        return data
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
 */
export function saveHistory(task, args, label) {
  ensureDataDir()
  const all = readHistory()
  const entry = { task, args, label, timestamp: new Date().toISOString() }
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
 * @returns {HistoryEntry[]}
 */
export function getHistory(task) {
  return readHistory().filter(e => e.task === task)
}

/**
 * 交互式选择是否复用历史命令
 * 返回选中的历史 args 或 null（表示用户选择新建）
 *
 * @param {string} task - 任务名称
 * @returns {Promise<string[] | null>}
 */
export async function promptHistory(task) {
  const history = getHistory(task)
  if (history.length === 0)
    return null

  const mode = assertNotCancel(await select({
    message: 'How to proceed?',
    options: [
      { value: 'new', label: 'New configuration', hint: 'Start fresh' },
      { value: 'history', label: 'From history', hint: `${history.length} record(s)` },
    ],
  }))

  if (mode === 'new')
    return null

  // 展示历史列表
  const entry = assertNotCancel(await select({
    message: 'Select from history',
    options: history.map((e, i) => ({
      value: i,
      label: e.label,
      hint: new Date(e.timestamp).toLocaleString(),
    })),
  }))

  return history[entry].args
}

// ─── 日志 ────────────────────────────────────────────────────────────────────

/**
 * 询问用户是否保存日志
 * @returns {Promise<boolean>}
 */
export async function promptSaveLog() {
  return assertNotCancel(await confirm({
    message: 'Save output to log file?',
    initialValue: false,
  }))
}

/**
 * 生成友好的日志文件路径
 * 格式: .mise-logs/{task}-{context}-{YYYY-MM-DD_HH-mm-ss}.log
 *
 * @param {string} task    - 任务名
 * @param {string} context - 上下文标识（如 apps/icones）
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
 * @returns {Promise<number>} exit code
 */
export function exec(cmd, args, logFile = null) {
  return new Promise((resolve) => {
    if (logFile) {
      // tee 模式：通过 pipe 手动将输出同时写到终端和文件
      const stream = createWriteStream(logFile, { flags: 'a' })
      const proc = spawn(cmd, args, { stdio: ['inherit', 'pipe', 'pipe'] })

      proc.stdout.on('data', (data) => {
        process.stdout.write(data)
        stream.write(data)
      })
      proc.stderr.on('data', (data) => {
        process.stderr.write(data)
        stream.write(data)
      })
      proc.on('close', (code) => {
        stream.end()
        resolve(code ?? 1)
      })
    }
    else {
      const proc = spawn(cmd, args, { stdio: 'inherit' })
      proc.on('close', code => resolve(code ?? 1))
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
    log.error('`act` is not installed or not found on PATH')
    log.info('Install via: mise install act@latest')
    process.exit(1)
  }
}

// ─── 通用确认执行 ────────────────────────────────────────────────────────────

/**
 * 显示即将执行的命令并确认 → 执行 → 保存历史 / 写日志
 *
 * @param {object}   opts
 * @param {string}   opts.task     - 任务名称
 * @param {string[]} opts.args     - act 参数
 * @param {string}   opts.label    - 历史记录可读摘要
 * @param {string}   opts.context  - 上下文标识（用于日志文件名）
 * @param {boolean}  opts.saveLog  - 是否保存日志
 */
export async function confirmAndRun({ task, args, label, context, saveLog }) {
  note(`act ${args.join(' ')}`, 'Command')

  const shouldRun = assertNotCancel(await confirm({
    message: 'Execute?',
    initialValue: true,
  }))

  if (!shouldRun) {
    cancel('Aborted')
    process.exit(0)
  }

  // 保存到历史
  saveHistory(task, args, label)

  // 日志文件
  const logFile = saveLog ? getLogPath(task, context) : null
  if (logFile) {
    log.info(`Log will be saved to: ${logFile}`)
  }

  log.step('Executing workflow...')
  console.log()

  const exitCode = await exec('act', args, logFile)

  console.log()
  if (exitCode !== 0) {
    log.error(`Workflow exited with code ${exitCode}`)
    if (logFile)
      log.info(`Check log: ${logFile}`)
    process.exit(exitCode)
  }

  if (logFile)
    log.success(`Log saved to: ${logFile}`)
}

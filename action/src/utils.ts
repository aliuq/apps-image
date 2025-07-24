import type Buffer from 'node:buffer'
import * as core from '@actions/core'
import * as exec from '@actions/exec'
import { cyan, yellow } from 'kolorist'
import { isDebug } from './config.js'

// let _isDebug = undefined

/**
 * Execute a command and return the output
 */
export async function execCommand(command: string, args?: string[], options?: exec.ExecOptions) {
  let result = ''
  let error = ''
  const logger = createLoggerNs()
  try {
    await exec.exec(command, args, {
      listeners: {
        stdout: (data: Buffer) => {
          result += data.toString()
        },
        stderr: (data) => {
          error += data.toString()
        },
      },
      silent: !core.isDebug(),
      ...options,
    })
    return result?.trim?.()
  }
  catch (e: any) {
    logger.info(yellow(command))

    core.warning(
      [error?.trim() || e.message?.trim(), `command: ${command}`].join('\n'),
      { title: 'Command Execution Error' },
    )
    return ''
  }
}

/**
 * 创建一个日志记录器
 * @param ns 命名空间
 * @returns
 */
export function createLogger(ns: string) {
  return (msg: string) => core.info(`${cyan(`#${ns}`)}: ${msg}`)
}

/**
 * 创建一个命名空间的日志记录器
 * @param ns 命名空间
 * @returns
 */
export function createLoggerNs(ns?: string, useColor = false) {
  const func = useColor ? cyan : (str: string | number) => String(str)
  const prefix = ns ? `${func(`#${ns}`)}: ` : ''
  return {
    info: (msg: string) => core.info(`${prefix}${msg}`),
    warning: (msg: string) => core.warning(`${prefix}${msg}`),
    error: (msg: string) => core.error(`${prefix}${msg}`),
    debug: (msg: string) => isDebug && core.info(`${prefix}${msg}`),
    group: (label: string, fn: () => Promise<void>) => core.group(`${prefix}${label}`, fn),
    groupJson: (label: string, data: object) => core.group(
      `${prefix}${label}`,
      async () => core.info(JSON.stringify(data, null, 2)),
    ),
    debugGroup: (label: string, fn: () => Promise<void>) => isDebug && core.group(`${prefix}${label}`, fn),
    debugGroupJson: (label: string, data: object) => isDebug && core.group(
      `${prefix}${label}`,
      async () => core.info(JSON.stringify(data, null, 2)),
    ),
  }
}

/**
 * Log debug message
 */
export function logDebug(msg: string): void {
  isDebug && core.info(msg)
}

/**
 * 添加 HTML 转义函数
 */
export function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&#39;',
  }

  return text.replace(/[&<>"']/g, match => htmlEscapes[match])
}

export function formatDate(input: string | Date = new Date()): string {
  const date = typeof input === 'string' ? new Date(input) : input
  return date.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour12: false, // 使用 24 小时制
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).replace(/\//g, '-')
}

/**
 * 日志处理
 */

import * as core from '@actions/core'
import dayjs from 'dayjs'
import dayjsDuration from 'dayjs/plugin/duration.js'
import { blue, cyan, gray, green, magenta, red, yellow } from 'kolorist'
import superjson from 'superjson'
import { isAct, isDebug } from './config.js'

dayjs.extend(dayjsDuration)

type CoreFunc = 'debug' | 'info' | 'warning' | 'error' | 'setFailed' | 'startGroup' | 'endGroup'

export type LogFormat = 'simple' | 'detailed' | 'json'

export interface LoggerOptions {
  /** 是否启用颜色输出 */
  color?: boolean
  /** 日志格式 */
  format?: LogFormat
  /** 是否启用时间戳 */
  timestamp?: boolean
}

export interface LogEntry {
  level: string
  message: string
  namespace: string[]
  timestamp: number
  data?: any
}

const colorsFunc = [cyan, gray, red, yellow, magenta, blue, green]
let _prevColor: string | null = null

/**
 * 获取随机颜色函数，用于日志输出时随机选择颜色
 */
export function getRandomColor() {
  const colors = _prevColor ? colorsFunc.filter(c => c.name !== _prevColor) : colorsFunc
  const func = colors[Math.floor(Math.random() * colors.length)]
  _prevColor = func.name
  return func
}

const logColorMap: Record<string, (str: string) => string> = {
  debug: gray,
  info: cyan,
  warning: yellow,
  error: red,
}

/**
 * 合并配置选项
 * FIXME 无法区分是来自检查版本还是解析数据
 */
function mergeOptions(options: LoggerOptions = {}): Required<LoggerOptions> {
  // const config = getCheckVersionConfig()
  // const format = config.logFormat || 'detailed'
  return Object.assign({}, { color: isDebug, format: 'detailed', timestamp: isDebug }, options)
}

/**
 * 安全的 JSON 字符串化，处理循环引用和错误边界
 */
export function safeStringify(obj: any, space?: number) {
  const serialized = superjson.serialize(obj)
  return JSON.stringify(serialized.json, null, space)
}

/**
 * 将秒数格式化为时间字符串
 * @param ms - 毫秒数
 * @param style - 输出样式
 */
export function formatDuration(ms: string | number, style: 'digital' | 'text' = 'text') {
  const d = dayjs.duration(+ms, 'milliseconds')
  const h = d.hours()
  const m = d.minutes()
  const s = d.seconds()

  if (style === 'digital') {
    // 数字式：支持自动补零
    const pad = (n: number) => String(n).padStart(2, '0')
    if (h > 0)
      return `${pad(h)}:${pad(m)}:${pad(s)}`
    return `${pad(m)}:${pad(s)}`
  }

  // 文字式：自动省略 0
  return [
    h ? `${h}h` : '',
    m ? `${m}min` : '',
    `${s}s`,
  ].filter(Boolean).join(' ')
}

export class Logger {
  private namespaces: string[] = []
  private options: Required<LoggerOptions>

  constructor(options: LoggerOptions = {}, namespaces: string[] = []) {
    this.options = mergeOptions(options)
    this.namespaces = [...namespaces]
  }

  /**
   * 格式化命名空间
   */
  private formatNamespace(namespaces: string[]) {
    if (!namespaces?.length)
      return ''
    const nsStr = namespaces.join(':')
    return this.options.color ? `[${cyan(nsStr)}] ` : `[${nsStr}] `
  }

  /**
   * 格式化日志消息
   */
  private formatMessage(entry: LogEntry) {
    const { level, message, namespace, data } = entry
    const nsPrefix = this.formatNamespace(namespace)

    // 构建基础消息
    let formattedMessage = message

    // 在详细模式下自动附加数据
    if (data !== undefined) {
      const dataStr = safeStringify(data, !isAct ? 0 : 2)
      formattedMessage = !isAct ? `${message} ${dataStr}` : `${message}\n${dataStr}`
    }

    switch (this.options.format) {
      case 'json': {
        return safeStringify({
          level,
          message,
          namespace: namespace.join('.'),
          timestamp: new Date(entry.timestamp).toISOString(),
          data: entry.data,
        })
      }

      case 'detailed': {
        const timestamp = this.options.timestamp ? dayjs().format('HH:mm:ss.SSS') : null
        const upperLevel = level.toUpperCase().padEnd(5)
        // debug 和 info 才需要，warn 和 error 不需要
        const levelStr = this.options.color ? (logColorMap[level]?.(upperLevel) || upperLevel) : upperLevel
        const timePrefix = timestamp ? `[${gray(timestamp)}] ` : ''
        return `${timePrefix}${['debug', 'info'].includes(level) ? levelStr : ''} ${nsPrefix}${formattedMessage}`
      }

      case 'simple':
      default:
        return `${nsPrefix}${formattedMessage}`
    }
  }

  /**
   * 安全的日志输出（带错误边界）
   */
  private safeLog(level: string, message: string, data?: any) {
    try {
      const entry: LogEntry = { level, message, namespace: this.namespaces, timestamp: Date.now(), data }
      const finalMessage = this.formatMessage(entry)
      const realLevel = (['debug', 'info', 'warning', 'error'].includes(level) ? level : 'info') as CoreFunc

      if (realLevel === 'debug' && isDebug) {
        core.info(finalMessage)
      }
      else if (realLevel !== 'debug') {
        core[realLevel](finalMessage)
      }
    }
    catch (error) {
      const fallbackMessage = `[Logger Error] ${message} (原始错误: ${error instanceof Error ? error.message : 'Unknown'})`
      core.error(fallbackMessage)
    }
  }

  public debug(message: string, data?: any) {
    this.safeLog('debug', message, data)
  }

  public info(message: string, data?: any) {
    this.safeLog('info', message, data)
  }

  public warn(message: string, data?: any) {
    this.safeLog('warning', message, data)
  }

  public error(message: string, data?: any) {
    this.safeLog('error', message, data)
  }

  public async group(label: string, fn: () => Promise<void>): Promise<void> {
    const prefix = this.formatNamespace(this.namespaces)
    const fullLabel = `${prefix}${label}`
    return await core.group(fullLabel, fn)
  }

  public child(...namespace: string[]): Logger {
    return new Logger(this.options, [...this.namespaces, ...namespace])
  }

  public line(message: string = '') {
    core.info(message)
  }

  /**
   * 打印对象
   * `label info: foo=bar, baz=qux`
   */
  public data(label: string, data: Record<string, any>) {
    const dataStr = Object.entries(data).map(([key, value]) => `${key}=${cyan(value)}`).join(', ')
    return this.safeLog('debug', `${label}: ${dataStr}`)
  }

  public async json(data: any, label?: string) {
    const jsonStr = safeStringify(data, this.options.format === 'json' ? 0 : 2)
    if (label) {
      await this.group(label, async () => core.info(jsonStr))
    }
    else {
      this.safeLog('info', jsonStr)
    }
  }

  public async time<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const startTime = Date.now()
    this.debug(`▶️ ${label} started`)

    const getFunc = (ms: number) => ms > 20 * 1000 ? red : cyan

    try {
      const result = await fn()
      const duration = Date.now() - startTime
      this.info(`✅ ${label} completed in ${getFunc(duration)(formatDuration(duration))}`)
      return result
    }
    catch (error) {
      const duration = Date.now() - startTime
      this.error(`❌ ${label} failed after ${getFunc(duration)(formatDuration(duration))}`, error)
      throw error
    }
  }

  public setFailed(message: string, error?: Error) {
    this.error(message, error)
    core.setFailed(message)
  }

  public getOptions(): Readonly<LoggerOptions> {
    return { ...this.options }
  }
}

/**
 * 创建日志器实例（多重载版本）
 */
export function createLogger(): Logger
export function createLogger(options: LoggerOptions): Logger
export function createLogger(namespace: string, ...moreNamespaces: string[]): Logger
export function createLogger(options: LoggerOptions, namespace: string, ...moreNamespaces: string[]): Logger
export function createLogger(optionsOrNamespace?: LoggerOptions | string, ...namespaces: string[]): Logger {
  // 判断第一个参数的类型
  if (typeof optionsOrNamespace === 'string') {
    // 第一个参数是字符串，说明是命名空间模式
    // createLogger('namespace1', 'namespace2', ...)
    const allNamespaces = [optionsOrNamespace, ...namespaces]
    return new Logger({}, allNamespaces)
  }
  else if (optionsOrNamespace && typeof optionsOrNamespace === 'object') {
    // 第一个参数是对象，说明是选项模式
    if (namespaces.length > 0) {
      // createLogger(options, 'namespace1', 'namespace2', ...)
      return new Logger(optionsOrNamespace, namespaces)
    }
    else {
      // createLogger(options)
      return new Logger(optionsOrNamespace)
    }
  }
  else {
    // createLogger() - 默认模式
    return new Logger()
  }
}

/** 全局日志器配置 */
let globalLoggerOptions: Required<LoggerOptions> = mergeOptions()
/** 默认日志器实例（私有变量） */
let _logger = createLogger(globalLoggerOptions)

/** 更新全局日志器配置 */
export function updateLoggerConfig(options: Partial<LoggerOptions>) {
  globalLoggerOptions = mergeOptions({ ...globalLoggerOptions, ...options })
  _logger = createLogger(globalLoggerOptions)
}

/** 设置日志格式 */
export function setLogFormat(format: LogFormat) {
  updateLoggerConfig({ format })
}

export const logger = _logger

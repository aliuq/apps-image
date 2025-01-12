import type Buffer from 'node:buffer'
import * as core from '@actions/core'
import * as exec from '@actions/exec'
import { cyan } from 'kolorist'
import { isDebug } from './config.js'

// let _isDebug = undefined

/**
 * Execute a command and return the output
 */
export async function execCommand(command: string, args?: string[], options?: exec.ExecOptions): Promise<string> {
  let result = ''
  let error = ''
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
      silent: !isDebug,
      ...options,
    })
    return result?.trim?.()
  }
  catch (e: any) {
    if (error)
      core.warning(error)
    core.warning(e.message)
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
 * Log debug message
 */
export function logDebug(msg: string): void {
  isDebug && core.info(msg)
}

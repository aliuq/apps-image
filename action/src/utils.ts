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
  // if (_isDebug === undefined) {
  //   _isDebug = core.isDebug()
  // }
  let result = ''
  await exec.exec(command, args, {
    listeners: {
      stdout: (data: Buffer) => {
        result += data.toString()
      },
    },
    silent: !isDebug,
    ...options,
  })
  return result?.trim?.()
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

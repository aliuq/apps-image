import type Buffer from 'node:buffer'
import * as core from '@actions/core'
import * as exec from '@actions/exec'

/**
 * Execute a command and return the output
 */
export async function execCommand(command: string, args?: string[], options?: exec.ExecOptions): Promise<string> {
  let result = ''
  await exec.exec(command, args, {
    listeners: {
      stdout: (data: Buffer) => {
        result += data.toString()
      },
    },
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
  return (msg: string) => core.info(`[${ns}]: ${msg}`)
}

import process from 'node:process'
import * as core from '@actions/core'
import * as gh from '@actions/github'

export const isAct = process.env.ACT === 'true'

/**
 * 是否为调试模式
 */
export const isDebug = core.getBooleanInput('debug') || core.isDebug()

/**
 * 获取当前分支名称
 */
export function getCurrentBranch() {
  const ghContext = gh.context

  // 从不同的事件类型中获取分支信息
  let branch = 'master' // 默认值

  try {
    if (ghContext.eventName === 'push') {
      // push 事件：从 ref 中提取分支名
      // refs/heads/master -> master
      branch = ghContext.ref.replace('refs/heads/', '')
    }
    else if (ghContext.eventName === 'pull_request') {
      // PR 事件：获取目标分支
      branch = ghContext.payload.pull_request?.base?.ref || 'master'
    }
    else if (ghContext.eventName === 'workflow_dispatch') {
      // 手动触发：从 ref 中提取
      branch = ghContext.ref.replace('refs/heads/', '')
    }
    else {
      // 其他事件：尝试从 ref 中提取
      if (ghContext.ref.startsWith('refs/heads/')) {
        branch = ghContext.ref.replace('refs/heads/', '')
      }
    }

    // 如果分支名为空或者是 refs 格式，使用默认值
    if (!branch || branch.startsWith('refs/')) {
      branch = 'master'
    }
  }
  catch (error) {
    core.warning(`Failed to get current branch: ${error instanceof Error ? error.message : 'Unknown error'}`)
    branch = 'master'
  }

  return branch
}

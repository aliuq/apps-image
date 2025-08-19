/**
 * 通用工具函数模块
 */

export function pick<Data extends object, Keys extends keyof Data>(data: Data, keys: Keys[]): Pick<Data, Keys> {
  const result = {} as Pick<Data, Keys>

  for (const key of keys) {
    result[key] = data[key]
  }

  return result
}

export function omit<Data extends object, Keys extends keyof Data>(data: Data, keys: Keys[]): Omit<Data, Keys> {
  const result = { ...data }

  for (const key of keys) {
    delete result[key]
  }

  return result as Omit<Data, Keys>
}

export function get(object: Record<string, any> | undefined, path: (string | number)[] | string, defaultValue?: any): any {
  if (typeof path === 'string') {
    path = path.split('.').map((key) => {
      const numKey = Number(key)
      return Number.isNaN(numKey) ? key : numKey
    })
  }

  let result: any = object

  for (const key of path) {
    if (result === undefined || result === null) {
      return defaultValue
    }

    result = result[key]
  }

  return result !== undefined ? result : defaultValue
}

export function set(object: Record<string, any>, path: (string | number)[] | string, value: any): void {
  if (typeof path === 'string') {
    path = path.split('.').map((key) => {
      const numKey = Number(key)
      return Number.isNaN(numKey) ? key : numKey
    })
  }

  path.reduce((acc, key, i) => {
    if (acc[key] === undefined)
      acc[key] = {}
    if (i === path.length - 1)
      acc[key] = value
    return acc[key]
  }, object)
}

/**
 * 函数式错误处理的 Result 类型
 */
export type Result<T, E = Error>
  = | { readonly success: true, readonly data: T }
    | { readonly success: false, readonly error: E }

export type AsyncResult<T, E = Error> = Promise<Result<T, E>>

/**
 * 创建成功结果
 */
export function createSuccess<T>(data: T): Result<T, never> {
  return { success: true, data }
}

/**
 * 创建失败结果
 */
export function createError<E = Error>(error: E): Result<never, E> {
  return { success: false, error }
}

/**
 * 安全执行异步函数，返回 Result
 */
export async function safeAsync<T>(fn: () => Promise<T>): Promise<Result<T, Error>> {
  try {
    const result = await fn()
    return createSuccess(result)
  }
  catch (error) {
    return createError(error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * 安全执行同步函数，返回 Result
 */
export function safe<T>(fn: () => T): Result<T, Error> {
  try {
    const result = fn()
    return createSuccess(result)
  }
  catch (error) {
    return createError(error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * 延迟执行
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 规范化版本号（移除 v 前缀）
 */
export function normalizeVersion(version: string): string {
  return version.replace(/^v/, '')
}

/**
 * 数组分块
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

/**
 * 转义正则表达式特殊字符
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 补全 `repo` 完整路径
 * - 如果是简写格式 `owner/repo`，则转换为完整的 GitHub URL
 * - 如果是完整的 URL，则直接返回
 */
export function detectRepo(repo: string) {
  return /^https?:\/\//.test(repo) ? repo : `https://github.com/${repo}`
}

/**
 * 提取 `owner/repo`
 * - 如果是 GitHub URL，则提取 `owner/repo`
 * - 如果已经是简写格式，则直接返回
 * - 非 GitHub URL 返回原值以保持完整地址标识
 */
export function detectRepoName(repo: string) {
  // 只支持 GitHub 平台的 URL 格式
  // 支持: https://github.com/owner/repo
  const httpsMatch = repo.match(/https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/)

  if (httpsMatch) {
    return `${httpsMatch[1]}/${httpsMatch[2]}`
  }

  // 如果已经是 owner/repo 格式，直接返回
  if (/^[^/]+\/[^/]+$/.test(repo)) {
    return repo
  }

  // 非 GitHub URL 返回原值以保持完整地址标识
  return repo
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

export function parseVersionLoose(version: string) {
  // 宽松匹配：可有 v 前缀，可有空格，minor/patch 可选，后缀忽略
  const regex = /v?\s*(\d+)(?:\.(\d+))?(?:\.(\d+))?/i

  const match = version.match(regex)
  if (!match) {
    return null
  }

  return {
    major: String(Number.parseInt(match[1], 10)),
    minor: String(match[2] ? Number.parseInt(match[2], 10) : 0),
    patch: String(match[3] ? Number.parseInt(match[3], 10) : 0),
  }
}

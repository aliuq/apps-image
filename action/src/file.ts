/**
 * 文件相关操作
 */
import fs from 'node:fs/promises'
import path from 'node:path'

/**
 * 检查路径是否存在
 */
export async function pathExists(path: string) {
  try {
    await fs.access(path, fs.constants.F_OK)
    return true
  }
  catch {
    return false
  }
}

/**
 * 安全地创建目录
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true })
  }
  catch (error) {
    if (error instanceof Error && 'code' in error && error.code !== 'EEXIST') {
      throw error
    }
  }
}

/**
 * 读取文件
 */
export async function readFile(filePath: string) {
  try {
    return await fs.readFile(filePath, 'utf-8')
  }
  catch {
    return null
  }
}

/**
 * 读取 JSON
 */
export async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const content = await readFile(filePath)
    return content ? JSON.parse(content) as T : null
  }
  catch {
    return null
  }
}

/**
 * 安全地写入文件
 */
export async function writeFile(filePath: string, content: string) {
  try {
    await ensureDir(path.dirname(filePath))
    await fs.writeFile(filePath, content, 'utf-8')
    return true
  }
  catch (error) {
    console.error(`Failed to write file ${filePath}:`, error)
    return false
  }
}

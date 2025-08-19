/**
 * 验证器 - 使用外部 schema 文件
 */

import type { Schema, ValidateFunction } from 'ajv'
import path from 'node:path'
import process from 'node:process'
import { Ajv } from 'ajv'
import addFormats from 'ajv-formats'
import { yellow } from 'kolorist'
import { readJson } from '../file.js'
import { createLogger } from '../logger.js'

export class Validator {
  private readonly ajv: Ajv
  private validateAppMetaFn?: ValidateFunction
  private readonly logger = createLogger('ajv')

  constructor() {
    this.ajv = new Ajv({ allErrors: true, verbose: true })
    addFormats.default(this.ajv)
  }

  /**
   * 加载外部 schema 文件
   */
  private async loadSchema() {
    try {
      if (this.validateAppMetaFn) {
        return
      }
      // 从项目根目录的 .vscode/meta.schema.json 加载 schema
      const schemaPath = path.join(process.cwd(), '.vscode', 'meta.schema.json')
      const schema = await readJson<Schema>(schemaPath)
      if (!schema) {
        this.logger.warn(`Failed to load meta schema at ${schemaPath}`)
        return
      }
      this.validateAppMetaFn = this.ajv.compile(schema)
    }
    catch (error) {
      throw new Error(`Failed to load meta schema: ${error}`)
    }
  }

  /**
   * 验证应用元数据
   */
  async validateAppMeta<T = any>(data: T) {
    await this.loadSchema()
    if (!this.validateAppMetaFn) {
      this.logger.warn(yellow('No validation function available, schema might not be loaded'))
      return false
    }

    const valid = this.validateAppMetaFn(data)

    if (!valid) {
      const errorMessage = this.ajv.errorsText(this.validateAppMetaFn.errors)
      this.logger.debug(`Validation failed: ${errorMessage}`)
      return false
    }

    return data
  }
}

/**
 * 缓存的验证器实例
 */
let cachedValidator: Validator | null = null

/**
 * 获取缓存的验证器实例
 */
function getValidator(): Validator {
  if (!cachedValidator) {
    cachedValidator = new Validator()
  }
  return cachedValidator
}

/**
 * 验证应用元数据
 */
export async function validateAppMeta<T = any>(data: T) {
  const validator = getValidator()
  return await validator.validateAppMeta<T>(data)
}

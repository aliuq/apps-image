import type { BaseMeta, CheckResult } from '../../types.js'
import { createLogger } from '../../utils.js'

export class BaseVersionHandler {
  async check(meta: BaseMeta): Promise<CheckResult> {
    const logger = createLogger(`[BASE] ${meta.name}`)

    // 基础镜像通常是手动版本控制
    // 检查是否有 Dockerfile 变更等
    logger('待实现')

    return {
      hasUpdate: false,
      meta,
      status: 'success',
    }
  }
}

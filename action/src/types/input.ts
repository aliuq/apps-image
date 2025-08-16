/**
 * 检查版本更新接收的输入类型
 */
export interface CheckVersionInputs {
  /**
   * GitHub Token，用于创建 PR
   */
  token?: string
  /**
   * 上下文路径，唯一标识应用，当提供时，将用于查找应用的元数据
   *
   * - `all` 是一个特殊的值，表示检查所有应用
   * @default all
   */
  context?: string
  /**
   * 并发数，控制同时处理的应用数量，默认为 `3`
   * @default 3
   */
  concurrency: number
  /**
   * 是否创建 PR
   * - `true` - 创建 PR，使用 `update/xxx` 分支
   * - `false` - 不创建 PR
   * - `development` - 创建 PR，使用 `dev/xxx` 分支，该分支格式不会触发镜像构建
   * @default true
   */
  enablePr?: boolean | 'development'
  /**
   * 是否启用调试模式，调试模式下，将打印更多日志信息
   * @default false
   */
  debug?: boolean
  /**
   * 日志打印格式
   */
  logFormat?: 'simple' | 'detailed' | 'json'
}

/**
 * 解析数据接收的输入类型
 */
export interface ResolveMetadataInputs {
  /**
   * 上下文路径，唯一标识应用，当提供时，将用于查找应用的元数据
   *
   * - `all` 是一个特殊的值，表示检查所有应用
   * @default all
   */
  context?: string
  /**
   * 需要处理的变体名称
   *
   * @default latest
   */
  variants?: string
  /**
   * 是否启用调试模式，调试模式下，将打印更多日志信息
   * @default false
   */
  debug?: boolean
}

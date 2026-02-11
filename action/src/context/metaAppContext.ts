/**
 * 应用上下文 - 管理单个应用的完整生命周期
 */
import type { ImageVariant, Meta, PlaceholderData } from '../types/index.js'
import path from 'node:path'
import process from 'node:process'
import { cyan, yellow } from 'kolorist'
import { getCurrentBranch, ghContext, isAct } from '../config.js'
import { pathExists } from '../file.js'
import { createLogger } from '../logger.js'
import { detectRepo, escapeRegex, parseVersionLoose } from '../utils.js'

/**
 * 应用上下文类
 */
export class MetaAppContext {
  private readonly logger = createLogger('appContext')
  public readonly name: string // 应用名称（从 meta.json）

  constructor(public readonly context: string, private readonly meta: Meta) {
    this.name = meta.name
    this.logger = this.logger.child(context)
  }

  /**
   * 获取基于 context 的应用路径
   * @param p - 文件路径
   * @returns
   */
  private getPath(p: string) {
    return path.join(this.context, p)
  }

  /**
   * 获取元数据（只读）
   */
  public getMeta(): Readonly<Meta> {
    return this.meta
  }

  /**
   * 替换内容中的占位符
   *
   * - 自动生成占位符格式的正则变体：['$key$', '{{key}}', '{key}']
   * - 如果数组元素有两个，则同时替换占位符和指定版本
   * - 如果数组元素只有一个，则只替换占位符
   */
  private resolveTemplate(template: string, data?: PlaceholderData) {
    if (!data || !Object.keys(data)?.length) {
      return template
    }

    let content = template

    // 处理自定义替换值
    for (const [key, values] of Object.entries(data)) {
      if (!values?.length)
        continue

      // 生成占位符正则
      const placeholderPattern = [`$${key}$`, `{{${key}}}`, `{${key}}`].map(escapeRegex).join('|')
      const placeholderReg = new RegExp(placeholderPattern, 'g')
      // 替换占位符
      content = content.replace(placeholderReg, values[0] ?? '')

      // 如果存在转义的,需要恢复
      // \\{\\{version\\}\\} => {{version}}
      content = content.replace(/\\([{$}])/g, '$1')

      if (values.length === 2 && values[1]) {
        const oldValue = values[1]
        const oldValueReg = new RegExp(escapeRegex(oldValue), 'g')
        content = content.replace(oldValueReg, values[0])
      }
    }

    return content
  }

  /**
   * 构建 Docker 镜像需要的元数据
   * @see https://github.com/docker/metadata-action
   * @see https://github.com/docker/build-push-action
   */
  public async buildMatrixData(variants: Meta['variants'] = {}) {
    const matrixData = new Set()

    const { repo, owner } = ghContext.repo
    const defaultBranch = getCurrentBranch()
    const defaultManualUrl = `https://github.com/${owner}/${repo}/tree/${defaultBranch}/${this.context}`

    const dockerUser = process.env.DOCKERHUB_USERNAME
    const ghcrUser = process.env.GHCR_USERNAME
    const acrRegistry = process.env.ALI_ACR_REGISTRY
    const acrUser = process.env.ALI_ACR_USERNAME

    for await (const [variantName, variant] of Object.entries(variants)) {
      const isManual = ['manual'].includes(variant.checkver.type)
      const cord1 = ['version', 'tag', 'sha'].includes(variant.checkver.type) && (!variant?.version || !variant?.sha)
      const cord2 = isManual && (isAct ? !variant?.version : (!variant?.version || !variant?.sha))

      if (cord1 || cord2) {
        this.logger.warn(`${yellow(variantName)} variant is missing version or sha, skipping!`)
        continue // 如果没有版本或 sha，跳过
      }

      const { version, sha } = variant
      const isLatest = variantName === 'latest'

      // Dockerfile
      const file = variant.docker?.file || (isLatest ? 'Dockerfile' : `Dockerfile.${variantName}`)
      const dockerfile = this.getPath(file)
      const exist = await pathExists(dockerfile)
      if (!exist) {
        this.logger.warn(`${yellow(file)} not found for variant ${cyan(variantName)}, skipping!`)
        continue
      }

      // Images
      const defaultImages = [
        dockerUser ? `${dockerUser}/{{name}}` : undefined,
        ghcrUser ? `ghcr.io/${ghcrUser}/{{name}}` : undefined,
        acrRegistry && acrUser ? `${acrRegistry}/${acrUser}/{{name}}` : undefined,
      ].filter(Boolean)
      const imagesContent = (variant.docker?.images || defaultImages).join('\n')
      const newImages = this.resolveTemplate(imagesContent, { name: [this.name] }).split('\n')
      const uniqueImages = Array.from(new Set(newImages))
      // Tags
      const defaultTags = [`type=raw,value=${variantName}`, 'type=raw,value={{version}}']
      const tagContent = (variant.docker?.tags || defaultTags).join('\n')
      // semver
      const match = (version && version.includes('.')) ? parseVersionLoose(version) : undefined
      const newTags = this.resolveTemplate(tagContent, {
        version: [version!],
        sha: [sha?.slice(0, 7)],
        fullSha: [sha],
        major: [match?.major],
        minor: [match?.minor],
        patch: [match?.patch],
      }).split('\n')
      const uniqueTags = Array.from(new Set(newTags))
      // Labels: created、description、licenses、revision、source、title、url、version
      const url = variant.checkver?.repo ? detectRepo(variant.checkver.repo) : (isManual ? defaultManualUrl : undefined)
      const labels = {
        description: this.meta.description || '',
        licenses: this.meta.license || '',
        revision: sha,
        source: url,
        title: this.meta.title || this.name || '',
        url,
        version,
        ...(variant.docker?.labels || {}),
      }
      const fullLabels = Object.entries(labels).map(([key, value]) => `org.opencontainers.image.${key}=${value}`)
      // 判断需要构建推送到平台
      const pushDocker = dockerUser && uniqueImages.some(im => im.startsWith(dockerUser))
      const pushGhcr = ghcrUser && uniqueImages.some(im => im.match(/^ghcr\.io\//))
      const pushAli = acrRegistry && acrUser && uniqueImages.some(im => im.match(/^registry\..*?\.aliyuncs\.com/))
      // platforms
      const platforms = variant.docker?.platforms || ['linux/amd64', 'linux/arm64']
      // 测试应用
      const isTest = this.context.startsWith('test/')
      // 是否推送镜像
      const shouldPush = (isTest || isAct) ? false : (variant?.docker?.push ?? true)
      // 是否推送 README
      const readmePath = this.getPath('README.md')
      const hasReadme = await pathExists(readmePath)
      // 是否存在 pre.sh 或 post.sh 脚本
      const hasPreScript = await pathExists(this.getPath(isLatest ? 'pre.sh' : `pre.${variantName}.sh`))
      const hasPostScript = await pathExists(this.getPath(isLatest ? 'post.sh' : `post.${variantName}.sh`))

      matrixData.add({
        name: this.name,
        variant: variantName,
        metadata: {
          images: uniqueImages,
          imageLines: uniqueImages.join('\n'),
          tags: uniqueTags,
          tagLines: uniqueTags.join('\n'),
          labels: fullLabels,
          labelLines: fullLabels.join('\n'),
        },
        build: {
          platforms,
          platformLines: platforms.join('\n'),
          file: dockerfile,
          context: this.context,
          // 测试应用不需要推送，固定为 false
          push: shouldPush,
        },
        readme: {
          push: shouldPush && pushDocker && hasReadme,
          path: readmePath,
          repo: `${dockerUser}/${this.name}`,
        },
        pushDocker,
        pushGhcr,
        pushAli,
        hasPreScript,
        hasPostScript,
      })
    }

    const matrixArray = Array.from(matrixData)
    return matrixArray?.length ? matrixArray : undefined
  }

  /**
   * 根据变体名称获取变体数据
   */
  public getChangedVariants(arr?: string[]) {
    if (!arr?.length)
      return

    const variants = {} as Record<string, ImageVariant>

    arr.forEach(v => this.meta.variants[v] && (variants[v] = this.meta.variants[v]))

    return variants
  }
}

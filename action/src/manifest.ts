import type { SummaryTableRow } from '@actions/core/lib/summary.js'
import type { Meta } from './types/schema.js'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import core from '@actions/core'
import fg from 'fast-glob'
import { pathExists, readFile, readJson, writeFile } from './file.js'
import { detectRepo } from './utils.js'

const cwd = path.join(__dirname, '../..')

async function getFiles() {
  const patterns = ['apps/**/meta.json', 'base/**/meta.json', 'sync/**/meta.json']
  const metaFiles = await fg.glob(patterns, { cwd, absolute: true })

  return Promise.all(metaFiles.map(async (file) => {
    const content = await readJson(file) as Meta
    return { ...content!, context: path.dirname(file) }
  }))
}

async function getContextList() {
  const patterns = ['apps/**/meta.json', 'base/**/meta.json', 'sync/**/meta.json', 'test/**/meta.json']
  const metaFiles = await fg.glob(patterns, { cwd })
  return metaFiles.map(file => path.dirname(file))
}

async function buildTable(apps: Array<Meta & { context: string }>) {
  core.summary.emptyBuffer()
  core.summary.addHeading(`应用列表 (${apps?.length || 0})`, 2)

  const tableRows: SummaryTableRow[] = []

  tableRows.push([
    { data: 'Name', header: true },
    { data: 'Description', header: true },
    { data: 'Version', header: true },
    { data: 'Stats', header: true },
    { data: 'URL', header: true },
  ])

  for await (const app of apps) {
    if (!app.variants) {
      continue
    }
    const hasReadme = await pathExists(path.join(app.context, 'README.md'))
    const latestVariant = app.variants.latest

    const rows: SummaryTableRow = []

    const repo = detectRepo(latestVariant?.checkver.repo || '')
    rows.push(repo ? `<a href="${repo}">${app.name}</a>` : app.name)
    rows.push((app.slogan ? splitTextByWidth(app.slogan, 28) : '') || '')

    const variantImage = latestVariant
      ? toImg(`badge/latest-${latestVariant.version}-${latestVariant.version !== 'N/A' ? 'blue' : 'gray'}`)
      : 'N/A'

    rows.push(variantImage)

    const dockerHubUrl = `https://hub.docker.com/r/aliuq/${app.name}`
    const dockerPull = toImg(`docker/pulls/aliuq/${app.name}?label=docker`, dockerHubUrl)
    const imageSize = toImg(`docker/image-size/aliuq/${app.name}?label=image`, dockerHubUrl)

    rows.push({ data: `${dockerPull} ${imageSize}` })

    const readmePath = path.relative(cwd, app.context)
    rows.push(toImg(`badge/README-${hasReadme ? 'blue' : 'gray'}`, readmePath))

    tableRows.push(rows)
  }

  core.summary.addTable(tableRows)

  return core.summary.stringify()
}

// 更新 README 中的应用列表
async function updateReadmeAppList(summary: string) {
  const readme = await readFile(path.join(cwd, 'README.md'))
  const reg = /(<!-- AppList Start -->)[\s\S]*(<!-- AppList End -->)/
  const updatedReadme = readme!.replace(reg, `$1\n${summary}\n$2`)
  await writeFile(path.join(cwd, 'README.md'), updatedReadme)
}

// 更新工作流中 context 选项
async function updateCiContextOption(contextList: string[]) {
  const reg = /(# ContextStart)[\s\S]*(# ContextEnd)/
  const space = '          '
  const context = contextList.sort().map(c => `${space}- ${c}`).join('\n')

  const checkVersionFile = path.join(cwd, '.github/workflows/check-version.yaml')
  const checkContent = await readFile(checkVersionFile)
  const updatedCheckContent = checkContent!.replace(reg, `$1\n${context}\n${space}$2`)
  await writeFile(checkVersionFile, updatedCheckContent)

  const buildImageFile = path.join(cwd, '.github/workflows/build-image.yaml')
  const buildContent = await readFile(buildImageFile)
  const updatedBuildContent = buildContent!.replace(reg, `$1\n${context}\n${space}$2`)
  await writeFile(buildImageFile, updatedBuildContent)

  const buildTestFile = path.join(cwd, '.github/workflows/build-test.yaml')
  const buildTestContent = await readFile(buildTestFile)
  const updatedBuildTestContent = buildTestContent!.replace(reg, `$1\n${context}\n${space}$2`)
  await writeFile(buildTestFile, updatedBuildTestContent)
}

async function main() {
  const apps = await getFiles()
  const summary = await buildTable(apps)
  await updateReadmeAppList(summary)

  const contextList = await getContextList()
  await updateCiContextOption(contextList)
}

main()

function toImg(url: string, href?: string) {
  if (!url.startsWith('http')) {
    url = `https://img.shields.io/${url}`
  }
  const img = `<img alt="Static Badge" src="${url}">`
  if (!href)
    return img

  return `<a href="${href}">${img}</a>`
}

function splitTextByWidth(text: string, maxWidth: number): string {
  if (!text)
    return ''

  const lines: string[] = []
  let currentLine = ''
  let currentWidth = 0

  for (const char of text) {
    // 中文字符宽度为2，英文字符宽度为1
    const charWidth = /[\u4E00-\u9FA5]/.test(char) ? 2 : 1

    // 如果添加当前字符会超过最大宽度，则开始新行
    if (currentWidth + charWidth > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = char
      currentWidth = charWidth
    }
    else {
      currentLine += char
      currentWidth += charWidth
    }
  }

  // 添加最后一行
  if (currentLine) {
    lines.push(currentLine)
  }

  // 使用 <br> 连接多行，适合在表格中显示
  return lines.join('<br>')
}

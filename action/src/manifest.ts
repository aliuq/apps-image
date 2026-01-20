import type { Meta } from './types/schema.js'
import path from 'node:path'
import fg from 'fast-glob'
import { readFile, readJson, writeFile } from './file.js'

const cwd = path.join(__dirname, '../..')

async function getContextList() {
  const patterns = ['apps/**/meta.json', 'base/**/meta.json', 'sync/**/meta.json', 'test/**/meta.json']
  const metaFiles = await fg.glob(patterns, { cwd })
  const apps = await Promise.all(metaFiles.sort().map(async (file) => {
    const content = await readJson(path.join(cwd, file)) as Meta
    return { ...content!, context: path.dirname(file) }
  }))
  return apps.filter(app => !app?.skip).map(app => app.context)
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
  const contextList = await getContextList()
  await updateCiContextOption(contextList)
}

main()

#!/usr/bin/env node

/**
 * Generate data.json from all meta.json files with complete default values
 */

const childProcess = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const rootDir = path.join(__dirname, '..')
const appsDir = path.join(rootDir, 'apps')
const baseDir = path.join(rootDir, 'base')
const outputDir = path.join(rootDir, 'docs')
const outputFile = path.join(outputDir, 'data.json')

const schemaPath = path.join(rootDir, '.vscode', 'meta.schema.json')
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'))

const DEFAULT_VALUES = {
  context: 'apps/{name}',
  readme: 'README.md',
  skip: false,
  enabled: true,
  branch: 'main',
  processFiles: ['Dockerfile'],
  file: 'Dockerfile',
  images: ['aliuq/{name}', 'ghcr.io/aliuq/{name}'],
  tags: [
    'type=raw,value=latest',
    'type=raw,value={{version}}',
    'type=raw,value={{sha}}',
  ],
  platforms: ['linux/amd64', 'linux/arm64'],
  push: true,
  load: false,
}

function getContextByType(type) {
  return type === 'base' ? `base/{name}` : `apps/{name}`
}

/**
 * Parse JSONC content (JSON with comments)
 */
function parseJSONC(content) {
  content = content.split('\n').map((line) => {
    const commentIndex = line.indexOf('//')
    if (commentIndex !== -1) {
      const beforeComment = line.substring(0, commentIndex)
      const quotes = (beforeComment.match(/"/g) || []).length
      if (quotes % 2 === 0) {
        return line.substring(0, commentIndex)
      }
    }
    return line
  }).join('\n')

  content = content.replace(/\/\*[\s\S]*?\*\//g, '')
  content = content.replace(/,(\s*[}\]])/g, '$1')

  return JSON.parse(content)
}

/**
 * Apply default values to an object based on schema
 */
function applyDefaults(meta, _category) {
  const result = { ...meta }

  const type = result.type || 'app'

  const applyPropertyDefaults = (obj, properties) => {
    for (const [key, propDef] of Object.entries(properties)) {
      if (key === '$ref' || key === 'additionalProperties')
        continue

      if (obj[key] === undefined && propDef.default !== undefined) {
        let defaultValue = propDef.default

        if (typeof defaultValue === 'string') {
          if (key === 'context') {
            defaultValue = getContextByType(type).replace('{name}', obj.name || '')
          }
          else {
            defaultValue = defaultValue.replace('{name}', obj.name || '')
          }
        }

        obj[key] = defaultValue
      }
    }
  }

  applyPropertyDefaults(result, schema.properties)

  if (result.variants) {
    for (const variant of Object.values(result.variants)) {
      if (variant.enabled === undefined) {
        variant.enabled = DEFAULT_VALUES.enabled
      }

      if (variant.checkver) {
        const checkver = variant.checkver

        if (checkver.branch === undefined) {
          checkver.branch = DEFAULT_VALUES.branch
        }

        if (checkver.processFiles === undefined) {
          checkver.processFiles = DEFAULT_VALUES.processFiles
        }
      }

      if (variant.docker) {
        const docker = variant.docker

        if (docker.file === undefined) {
          docker.file = DEFAULT_VALUES.file
        }

        if (docker.images === undefined) {
          docker.images = DEFAULT_VALUES.images.map(img =>
            img.replace('{name}', result.name),
          )
        }

        if (docker.tags === undefined) {
          docker.tags = DEFAULT_VALUES.tags
        }

        if (docker.platforms === undefined) {
          docker.platforms = DEFAULT_VALUES.platforms
        }

        if (docker.push === undefined) {
          docker.push = DEFAULT_VALUES.push
        }

        if (docker.load === undefined) {
          docker.load = DEFAULT_VALUES.load
        }
      }
    }
  }

  return result
}

/**
 * Read all meta.json files from a directory
 */
function readMetaFiles(dir, category) {
  const apps = []

  if (!fs.existsSync(dir)) {
    return apps
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isDirectory())
      continue

    const metaPath = path.join(dir, entry.name, 'meta.json')
    if (!fs.existsSync(metaPath))
      continue

    try {
      const content = fs.readFileSync(metaPath, 'utf-8')
      const meta = parseJSONC(content)

      const completeMeta = applyDefaults(meta, category)

      const relativePath = path.relative(rootDir, metaPath)

      const gitCommand = childProcess.spawnSync('git', [
        'log',
        '-1',
        '--format=%ct',
        '--',
        relativePath,
      ], {
        cwd: rootDir,
        encoding: 'utf-8',
      })

      let updatedAt
      if (gitCommand.status === 0 && gitCommand.stdout) {
        const timestamp = Number.parseInt(gitCommand.stdout.trim(), 10)
        if (!Number.isNaN(timestamp)) {
          updatedAt = new Date(timestamp * 1000).toISOString()
        }
      }

      apps.push({
        ...completeMeta,
        category,
        readmePath: category === 'app' ? `apps/${meta.name}` : `base/${meta.name}`,
        hasReadme: fs.existsSync(path.join(dir, entry.name, 'README.md')),
        updatedAt,
      })
    }
    catch (error) {
      console.error(`Error reading ${metaPath}:`, error.message)
    }
  }

  return apps
}

async function main() {
  const apps = [
    ...readMetaFiles(appsDir, 'app'),
    ...readMetaFiles(baseDir, 'base'),
  ]

  apps.sort((a, b) => {
    const dateA = new Date(a.updatedAt || 0).getTime()
    const dateB = new Date(b.updatedAt || 0).getTime()
    return dateB - dateA
  })

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const data = {
    generated: new Date().toISOString(),
    total: apps.length,
    apps,
  }

  fs.writeFileSync(outputFile, JSON.stringify(data, null, 2))

  console.log(`✅ Generated ${apps.length} apps to ${outputFile}`)
}

const process = require('node:process')

main().catch((error) => {
  console.error('Failed to generate data.json:', error.message)
  process.exitCode = 1
})

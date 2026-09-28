#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import { ESLint } from 'eslint'
import fg from 'fast-glob'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const schemaPath = path.join(rootDir, '.vscode', 'meta.schema.json')

function errorPath(error) {
  const location = error.instancePath || '/'
  if (error.keyword === 'required')
    return `${location === '/' ? '' : location}/${error.params.missingProperty}`
  if (error.keyword === 'additionalProperties')
    return `${location === '/' ? '' : location}/${error.params.additionalProperty}`
  return location
}

async function main() {
  const args = process.argv.slice(2).filter(arg => arg !== '--')
  const autoFix = !args.includes('--no-fix')
  const fileArgs = args.filter(arg => arg !== '--no-fix')
  const files = fileArgs.length > 0
    ? fileArgs.map(file => path.resolve(process.cwd(), file))
    : (await fg('**/meta.json', {
        cwd: rootDir,
        absolute: true,
        onlyFiles: true,
        ignore: ['deprecated/**', '**/node_modules/**', '**/dist/**', '.git/**'],
      })).sort()

  if (files.length === 0) {
    console.error('No meta.json files found.')
    process.exitCode = 1
    return
  }

  const schema = JSON.parse(await fs.readFile(schemaPath, 'utf8'))
  const ajv = new Ajv({ allErrors: true })
  addFormats(ajv)
  const validate = ajv.compile(schema)
  const failures = new Set()
  const parsedFiles = []

  for (const file of files) {
    const label = path.relative(rootDir, file) || file
    try {
      if (path.basename(file) !== 'meta.json')
        throw new Error('Expected a meta.json file')

      const data = JSON.parse(await fs.readFile(file, 'utf8'))
      if (!validate(data)) {
        failures.add(file)
        console.error(`${label}:`)
        for (const error of validate.errors ?? [])
          console.error(`  ${errorPath(error)} ${error.message}`)
      }
      else {
        parsedFiles.push(file)
      }
    }
    catch (error) {
      failures.add(file)
      console.error(`${label}: ${error.message}`)
    }
  }

  if (parsedFiles.length > 0) {
    const eslint = new ESLint({
      cwd: rootDir,
      fix: autoFix ? message => message.ruleId === 'jsonc/sort-keys' : false,
    })
    const results = await eslint.lintFiles(parsedFiles)
    if (autoFix) {
      await ESLint.outputFixes(results)
      for (const result of results) {
        if (typeof result.output === 'string')
          console.log(`Fixed field order: ${path.relative(rootDir, result.filePath)}`)
      }
    }
    for (const result of results) {
      const orderingErrors = result.messages.filter(message => message.ruleId === 'jsonc/sort-keys')
      if (orderingErrors.length === 0)
        continue

      failures.add(result.filePath)
      console.error(`${path.relative(rootDir, result.filePath)}:`)
      for (const error of orderingErrors)
        console.error(`  ${error.line}:${error.column} ${error.message}`)
    }
  }

  if (failures.size > 0) {
    console.error(`Failed: ${failures.size}/${files.length} meta.json files.`)
    process.exitCode = 1
  }
  else {
    console.log(`Valid: ${files.length} meta.json files.`)
  }
}

main().catch((error) => {
  console.error(`Meta validation failed: ${error.message}`)
  process.exitCode = 1
})

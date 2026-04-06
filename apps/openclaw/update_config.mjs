#!/usr/bin/env node

/**
 * Reads environment variables prefixed with `OC_` and writes them into
 * the OpenClaw JSON config file as structured key/value pairs.
 *
 * Naming convention for env vars:
 *   - `OC_` prefix is stripped; the remainder encodes the full config path.
 *   - `__` (double underscore) separates nested path segments.
 *   - `_` (single underscore) within a segment converts to camelCase:
 *     the segment is lowercased first, the first word stays lowercase,
 *     and each following word is capitalised.
 *   - Pure-numeric segments are treated as array indices (cannot be the first segment).
 *   - Values are parsed as JSON when possible, otherwise kept as plain strings.
 *
 * Examples:
 *   OC_port=8080                      → { "port": 8080 }
 *   OC_server__port=8080              → { "server": { "port": 8080 } }
 *   OC_server__host_name=localhost    → { "server": { "hostName": "localhost" } }
 *   OC_SERVER__MAX_RETRIES=3          → { "server": { "maxRetries": 3 } }
 *   OC_items__0__name=foo             → { "items": [{ "name": "foo" }] }
 *   OC_features__0=true               → { "features": [true] }
 *
 * The script is a no-op when no OC_ variables are set or the config file already exists.
 */

import { spawnSync } from 'node:child_process'
import { mkdir, open } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

// ─── Constants ───────────────────────────────────────────────────────────────

const ENV_PREFIX = 'OC_'
const CONFIG_FILE_NAME = 'openclaw.json'

/** Upper bound for array indices to avoid sparse-array memory/disk exhaustion. */
const MAX_ARRAY_INDEX = 10_000

// ─── Utilities ───────────────────────────────────────────────────────────────

/**
 * Throws a formatted error with optional detail text on a new line.
 */
function fail(message, details) {
  const suffix = details ? `\n${details}` : ''
  throw new Error(`${message}${suffix}`)
}

/**
 * Returns whether a path segment is a numeric array index.
 */
function isIndexSegment(segment) {
  return /^\d+$/.test(segment)
}

/**
 * Parses and validates a numeric array index string.
 * Throws if the index exceeds MAX_ARRAY_INDEX to prevent sparse-array memory exhaustion.
 */
function parseArrayIndex(segment, envName) {
  const index = Number.parseInt(segment, 10)
  if (index > MAX_ARRAY_INDEX) {
    fail(`Array index ${index} exceeds maximum allowed (${MAX_ARRAY_INDEX}) in: ${envName}`)
  }
  return index
}

/**
 * Attempts to parse a raw string value as JSON.
 * Falls back to the original string on parse failure or empty input.
 */
function parseEnvValue(rawValue) {
  const trimmed = rawValue.trim()
  if (!trimmed) {
    return rawValue
  }

  try {
    return JSON.parse(trimmed)
  }
  catch {
    return rawValue
  }
}

// ─── Env-name → config-path parsing ─────────────────────────────────────────

/**
 * Splits an env name suffix on `__` into path segments.
 * e.g. "server__host_name" → ["server", "host_name"]
 */
function splitPathSegments(rawName) {
  return rawName.split('__').map(segment => segment.trim()).filter(Boolean)
}

/**
 * Converts a single path segment to camelCase.
 * Pure-numeric segments (array indices) are returned unchanged.
 * e.g. "host_name" → "hostName", "0" → "0"
 */
function toCamelCase(segment) {
  if (isIndexSegment(segment))
    return segment

  const parts = segment.toLowerCase().split('_').map(part => part.trim()).filter(Boolean)
  if (parts.length === 0)
    return ''

  const [head, ...tail] = parts
  return head + tail.map(part => part[0].toUpperCase() + part.slice(1)).join('')
}

/**
 * Formats parsed path segments into dot/bracket notation for diagnostics.
 * e.g. ["server", "hostName"] → "server.hostName"
 */
function formatConfigPath(segments, envName) {
  return segments.reduce((accumulator, segment, index) => {
    if (isIndexSegment(segment)) {
      if (index === 0) {
        fail(`Array index cannot be the first path segment: ${envName}`)
      }
      return `${accumulator}[${segment}]`
    }

    return accumulator ? `${accumulator}.${segment}` : segment
  }, '')
}

/**
 * Parses a full env variable name into a structured config-path descriptor.
 */
function parseEnvName(envName) {
  const rawName = envName.slice(ENV_PREFIX.length)
  const segments = splitPathSegments(rawName).map(toCamelCase).filter(Boolean)

  if (segments.length === 0) {
    fail(`Invalid config env name: ${envName}`)
  }

  return {
    envName,
    segments,
    path: formatConfigPath(segments, envName),
  }
}

/**
 * Converts one `OC_*` environment variable entry into an update descriptor.
 */
function parseEnvUpdate([envName, rawValue]) {
  const parsed = parseEnvName(envName)
  return {
    envName,
    path: parsed.path,
    segments: parsed.segments,
    rawValue: rawValue ?? '',
  }
}

/**
 * Sorts shallower paths first so parent containers are created before children.
 */
function compareUpdates(left, right) {
  const depthDiff = left.segments.length - right.segments.length
  if (depthDiff !== 0) {
    return depthDiff
  }

  return left.path.localeCompare(right.path)
}

/**
 * Collects all `OC_*` environment variables and converts them into sorted updates.
 */
function collectUpdates() {
  return Object.entries(process.env)
    .filter(([envName]) => envName.startsWith(ENV_PREFIX))
    .map(parseEnvUpdate)
    .sort(compareUpdates)
}

// ─── Config file path resolution ─────────────────────────────────────────────

/**
 * Resolves the target config file path from well-known environment variables,
 * falling back to `~/.openclaw/openclaw.json`.
 *
 * Priority:
 *   1. OPENCLAW_CONFIG_PATH / CLAWDBOT_CONFIG_PATH  (explicit override)
 *   2. OPENCLAW_STATE_DIR/openclaw.json             (custom state directory)
 *   3. OPENCLAW_HOME/.openclaw/openclaw.json        (custom home directory)
 *   4. ~/.openclaw/openclaw.json                    (default)
 */
function resolveConfigPath() {
  const explicit = process.env.OPENCLAW_CONFIG_PATH?.trim() || process.env.CLAWDBOT_CONFIG_PATH?.trim()
  if (explicit) {
    return explicit
  }

  const stateDir = process.env.OPENCLAW_STATE_DIR?.trim()
  if (stateDir) {
    return path.join(stateDir, CONFIG_FILE_NAME)
  }

  const openclawHome = process.env.OPENCLAW_HOME?.trim()
  if (openclawHome) {
    return path.join(openclawHome, '.openclaw', CONFIG_FILE_NAME)
  }

  const homeDir = process.env.HOME?.trim() || os.homedir()
  return path.join(homeDir, '.openclaw', CONFIG_FILE_NAME)
}

// ─── Config object building ───────────────────────────────────────────────────

/**
 * Returns a new intermediate container inferred from the next path segment.
 */
function createContainer(nextSegment) {
  return isIndexSegment(nextSegment) ? [] : {}
}

/**
 * Ensures an intermediate container exists for the current segment and returns it.
 */
function ensureContainer(parent, segment, nextSegment, envName) {
  const arrayIndex = Array.isArray(parent) ? parseArrayIndex(segment, envName) : null
  const existing = Array.isArray(parent)
    ? parent[arrayIndex]
    : parent[segment]

  if (existing !== undefined && existing !== null && typeof existing === 'object') {
    return existing
  }

  const container = createContainer(nextSegment)
  if (Array.isArray(parent)) {
    parent[arrayIndex] = container
  }
  else {
    parent[segment] = container
  }

  return container
}

/**
 * Writes one parsed update into the target config object.
 */
function applyUpdate(root, update) {
  const { envName, segments } = update
  let current = root

  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index]
    const nextSegment = segments[index + 1]

    if (Array.isArray(current)) {
      if (!isIndexSegment(segment)) {
        fail(`Invalid array index segment: ${segment}`)
      }
      parseArrayIndex(segment, envName)
    }

    current = ensureContainer(current, segment, nextSegment, envName)
  }

  const leaf = segments[segments.length - 1]
  const value = parseEnvValue(update.rawValue)

  if (Array.isArray(current)) {
    if (!isIndexSegment(leaf)) {
      fail(`Invalid array index segment: ${leaf}`)
    }

    current[parseArrayIndex(leaf, envName)] = value
    return
  }

  current[leaf] = value
}

/**
 * Builds a fresh config object from the provided updates.
 */
function buildConfig(updates) {
  const config = {}

  for (const update of updates) {
    applyUpdate(config, update)
  }

  return config
}

/**
 * Serialises the config object as pretty-printed JSON with a trailing newline.
 */
function serializeConfig(config) {
  return `${JSON.stringify(config, null, 2)}\n`
}

// ─── File creation and validation ────────────────────────────────────────────

/**
 * Ensures the parent directory for the target config file exists.
 */
async function ensureConfigDirectory(configPath) {
  await mkdir(path.dirname(configPath), { recursive: true })
}

/**
 * Creates the config file exactly once using exclusive creation mode.
 * Returns false when another process already created the file.
 */
async function createInitialConfigFile(configPath, config) {
  let handle

  try {
    handle = await open(configPath, 'wx')
  }
  catch (error) {
    if (error?.code === 'EEXIST') {
      return false
    }
    throw error
  }

  try {
    await handle.writeFile(serializeConfig(config), 'utf8')
  }
  finally {
    await handle.close()
  }

  return true
}

/**
 * Runs `openclaw config validate` and fails when the command cannot be executed
 * or returns a non-zero exit code.
 */
function validateConfigFile() {
  const validationResult = spawnSync('openclaw', ['config', 'validate'], {
    stdio: ['ignore', 'ignore', 'inherit'],
  })

  if (validationResult.error) {
    fail('Failed to execute \'openclaw config validate\'', validationResult.error.message)
  }

  if (validationResult.status !== 0) {
    fail(`Config validation failed with exit code: ${validationResult.status}`)
  }
}

// ─── Entry point ─────────────────────────────────────────────────────────────

/**
 * Creates the initial OpenClaw config file from `OC_*` variables and validates it.
 * Returns early when there is nothing to write or another process already created the file.
 */
async function main() {
  const updates = collectUpdates()
  if (updates.length === 0)
    return

  const configPath = resolveConfigPath()
  const config = buildConfig(updates)

  await ensureConfigDirectory(configPath)

  const created = await createInitialConfigFile(configPath, config)
  if (!created)
    return

  validateConfigFile()
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[update-config] ${message}`)
  process.exit(1)
})

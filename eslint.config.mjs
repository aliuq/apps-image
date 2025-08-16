import antfu from '@antfu/eslint-config'

export default antfu(
  {
    type: 'lib',
    typescript: true,
    jsonc: true,
    yaml: true,
    javascript: true,
    ignores: ['dist', 'node_modules', '.history'],
  },
  {
    files: ['action/**/*.ts'],
    rules: {
      'ts/explicit-function-return-type': 'off',
    },
  },
  {
    files: ['spec/**/*.spec.js'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['**/*/meta.json'],
    rules: {
      'jsonc/array-element-newline': ['error', 'consistent'],
      'jsonc/array-bracket-newline': ['error', { multiline: true, minItems: 1 }],
      'jsonc/sort-keys': [
        'error',
        {
          pathPattern: '^$',
          order: [
            'name',
            'type',
            'title',
            'description',
            'license',
            'version',
            'skip',
            'sha',
            'context',
            'readme',
            'variants',
            'checkver',
            'dockerMeta',
            'sync',
          ],
        },
        {
          // checkver 字段排序
          pathPattern: '^checkver$',
          order: [
            'repo',
            'type',
            'file',
            'branch',
            'tag_pattern',
            'targetVersion',
            'processFiles',
            'check_frequency',
            'last_check',
            'tag_mappings',
          ],
        },
        {
          // variants.* 字段排序
          pathPattern: '^variants\\..+$',
          order: [
            'version',
            'sha',
            'enabled',
            'dockerfile',
            'images',
            'tags',
            'labels',
            'platforms',
            'buildArgs',
            'push',
            'cache',
            'secrets',
            'outputs',
            'checkver',
          ],
        },
        {
          // variants.*.checkver 字段排序
          pathPattern: '^variants\\..+\\.checkver$',
          order: [
            'repo',
            'type',
            'file',
            'branch',
            'tag_pattern',
            'targetVersion',
            'processFiles',
            'check_frequency',
            'last_check',
            'tag_mappings',
          ],
        },
        {
          // checkver.tag_mappings[] 字段排序
          pathPattern: '^checkver\\.tag_mappings\\[\\d+\\]$',
          order: [
            'source_tag',
            'target_tags',
            'last_sha',
            'last_sync',
            'enabled',
          ],
        },
        {
          pathPattern: '^dockerMeta$',
          order: [
            'dockerfile',
            'images',
            'tags',
            'labels',
            'platforms',
            'buildArgs',
            'push',
            'cache',
            'secrets',
            'outputs',
          ],
        },
        {
          // sync 字段排序
          pathPattern: '^sync$',
          order: [
            'source',
            'targets',
            'retry',
          ],
        },
        {
          // sync.source 字段排序
          pathPattern: '^sync\\.source$',
          order: [
            'registry',
            'image',
            'auth',
          ],
        },
        {
          // sync.targets[] 字段排序
          pathPattern: '^sync\\.targets\\[\\d+\\]$',
          order: [
            'registry',
            'image',
            'namespace',
            'tag_prefix',
            'tag_suffix',
            'auth',
          ],
        },
        {
          // sync.retry 字段排序
          pathPattern: '^sync\\.retry$',
          order: [
            'max_attempts',
            'delay_seconds',
          ],
        },
        {
          // auth 字段排序（通用）
          pathPattern: '^sync\\.(source|targets\\[\\d+\\])\\.auth$',
          order: [
            'username',
            'password',
          ],
        },
      ],
    },
  },
  {
    ignores: ['**/dist', '**/build'],
  },
)

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
    files: ['action/src/**/*.ts'],
    rules: {
      'ts/explicit-function-return-type': 'off',
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
            'version',
            'description',
            'skip',
            'repo',
            'sha',
            'checkVer',
            'dockerMeta',
            'sync',
          ],
        },
        {
          // checkVer 字段排序
          pathPattern: '^checkVer$',
          order: [
            'type',
            'file',
            'targetVersion',
            'branch',
            'tag_pattern',
            'check_frequency',
            'last_check',
            'variants',
            'default_variant',
            'tag_mappings',
          ],
        },
        {
          // checkVer.variants.* 字段排序
          pathPattern: '^checkVer\\.variants\\..+$',
          order: [
            'dockerfile',
            'tags',
            'platforms',
            'build_args',
          ],
        },
        {
          // checkVer.tag_mappings[] 字段排序
          pathPattern: '^checkVer\\.tag_mappings\\[\\d+\\]$',
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
            'images',
            'tags',
            'context',
            'dockerfile',
            'platforms',
            'build_args',
            'push',
            'readme_path',
            'labels',
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
)

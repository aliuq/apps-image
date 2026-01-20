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
            'slogan',
            'description',
            'license',
            'context',
            'readme',
            'variants',
            'skip',
          ],
        },
        {
        // variants.*.checkver 字段排序
          pathPattern: '^variants\\..+\\.checkver$',
          order: [
            'type',
            'repo',
            'branch',
            'file',
            'regex',
            'tagPattern',
            'targetVersion',
            'processFiles',
            'checkFrequency',
            'lastCheck',
          ],
        },
        {
        // variants.*.docker.cache 字段排序
          pathPattern: '^variants\\..+\\.docker\\.cache$',
          order: [
            'from',
            'to',
          ],
        },
        {
        // variants.*.docker 字段排序
          pathPattern: '^variants\\..+\\.docker$',
          order: [
            'file',
            'images',
            'tags',
            'platforms',
            'labels',
            'buildArgs',
            'secrets',
            'outputs',
            'cache',
            'push',
            'load',
          ],
        },
        {
        // variants.* 字段排序
          pathPattern: '^variants\\..+$',
          order: [
            'version',
            'sha',
            'enabled',
            'checkver',
            'docker',
          ],
        },
      ],
    },
  },
  {
    ignores: ['**/dist', '**/build', '.github/instructions', 'docs'],
  },
)

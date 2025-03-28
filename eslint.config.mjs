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
    files: ['apps/*/meta.json'],
    rules: {
      'jsonc/array-element-newline': ['error', 'consistent'],
      'jsonc/array-bracket-newline': ['error', { multiline: true, minItems: 1 }],
      'jsonc/sort-keys': [
        'error',
        {
          order: [
            'name',
            'version',
            'repo',
            'sha',
            'skip',
            'checkVer',
            'dockerMeta',
          ],
          pathPattern: '^$',
        },
        {
          pathPattern: '^checkVer$',
          order: [
            'type',
            'file',
          ],
        },
        {
          pathPattern: '^dockerMeta$',
          order: [
            'images',
            'context',
            'dockerfile',
            'platforms',
            'push',
            'tags',
            'labels',
          ],
        },
      ],
    },
  },
)

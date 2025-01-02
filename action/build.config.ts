import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: ['./src/index'],
  sourcemap: true,
  rollup: {
    emitCJS: true,
    esbuild: {
      minify: true,
    },
    inlineDependencies: true,
    output: {
      entryFileNames: '[name].js',
      chunkFileNames: 'chunks/[name].js',
    },
  },
  failOnWarn: false,
  hooks: {
    'rollup:options': (_ctx, options) => {
      // @ts-expect-error - types is Array<OutputOptions>
      options.output = options.output.filter((o: any) => o.format === 'cjs')
    },
  },
})

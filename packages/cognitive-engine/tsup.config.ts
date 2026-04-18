import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  // Bundle all @cognitive-engine/* deps into the output
  // so CJS consumers get a single file that works
  noExternal: [/@cognitive-engine\/.*/],
})

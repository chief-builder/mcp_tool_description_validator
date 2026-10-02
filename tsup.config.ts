import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  format: ['esm'],
  // tsup's dts build injects the `baseUrl` option, which TypeScript 6
  // deprecates. Silence it only here so the project tsconfig stays strict.
  dts: { compilerOptions: { ignoreDeprecations: '6.0' } },
  clean: true,
  sourcemap: true,
});

import { externalModules } from '@run-z/rollup-helpers';
import path from 'node:path';
import { defineConfig } from 'rollup';
import flatDts from 'rollup-plugin-flat-dts';
import ts from 'rollup-plugin-typescript2';
import typescript from 'typescript';

export default defineConfig({
  input: {
    'run-z': './src/index.ts',
    'run-z.builtins': './src/builtins/index.ts',
    'run-z.cli': './src/cli/index.ts',
    'run-z.core': './src/core/index.ts',
    'run-z.os': './src/os/index.ts',
  },
  plugins: [
    ts({
      typescript,
      tsconfig: 'tsconfig.main.json',
      cacheRoot: 'target/.rts2_cache',
      useTsconfigDeclarationDir: true,
    }),
  ],
  external: externalModules(),
  output: {
    format: 'esm',
    sourcemap: true,
    dir: '.',
    entryFileNames: 'dist/[name].js',
    chunkFileNames: 'dist/_[name].js',
    manualChunks(id) {
      if (id.startsWith(path.resolve('src', 'builtins') + path.sep)) {
        return 'run-z.builtins';
      }
      if (id.startsWith(path.resolve('src', 'cli') + path.sep)) {
        return 'run-z.cli';
      }
      if (id.startsWith(path.resolve('src', 'core') + path.sep)) {
        return 'run-z.core';
      }
      if (id.startsWith(path.resolve('src', 'os') + path.sep)) {
        return 'run-z.os';
      }

      return 'run-z';
    },
    hoistTransitiveImports: false,
    plugins: [
      flatDts({
        tsconfig: 'tsconfig.main.json',
        lib: true,
        compilerOptions: {
          declarationMap: true,
        },
        entries: {
          builtins: {},
        },
        internal: ['**/impl/**', '**/*.impl.ts'],
      }),
    ],
  },
});

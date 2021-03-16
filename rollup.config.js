import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import { externalModules } from '@run-z/rollup-helpers';
import path from 'path';
import flatDts from 'rollup-plugin-flat-dts';
import sourcemaps from 'rollup-plugin-sourcemaps';
import ts from 'rollup-plugin-typescript2';
import typescript from 'typescript';

export default {
  input: {
    'run-z': './src/index.ts',
    'run-z.builtins': './src/builtins/index.ts',
    'run-z.cli': './src/cli/index.ts',
    'run-z.core': './src/core/index.ts',
    'run-z.os': './src/os/index.ts',
  },
  plugins: [
    commonjs(),
    ts({
      typescript,
      tsconfig: 'tsconfig.main.json',
      cacheRoot: 'target/.rts2_cache',
      useTsconfigDeclarationDir: true,
    }),
    nodeResolve(),
    sourcemaps(),
  ],
  external: externalModules(),
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
  output: {
    format: 'esm',
    sourcemap: true,
    dir: '.',
    entryFileNames: 'dist/[name].js',
    chunkFileNames: 'dist/_[name].js',
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
      }),
    ],
  },
};

import { externalModules } from '@proc7ts/rollup-helpers';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import path from 'path';
import sourcemaps from 'rollup-plugin-sourcemaps';
import ts from 'rollup-plugin-typescript2';
import typescript from 'typescript';

export default {
  input: {
    'run-z': './src/index.ts',
    'run-z.cli': './src/cli/main.ts',
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
    if (id.startsWith(path.join(__dirname, 'src', 'cli') + path.sep)) {
      return 'run-z.cli';
    }
    if (id.startsWith(path.join(__dirname, 'src', 'core') + path.sep)) {
      return 'run-z.core';
    }
    if (id.startsWith(path.join(__dirname, 'src', 'os') + path.sep)) {
      return 'run-z.os';
    }
    return 'run-z';
  },
  output: [
    {
      format: 'cjs',
      sourcemap: true,
      dir: './dist',
      entryFileNames: '[name].js',
      chunkFileNames: `_[name].js`,
      hoistTransitiveImports: false,
    },
    {
      format: 'esm',
      sourcemap: true,
      dir: './dist',
      entryFileNames: '[name].mjs',
      chunkFileNames: `_[name].mjs`,
      hoistTransitiveImports: false,
    },
  ],
};

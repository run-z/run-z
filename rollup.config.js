import commonjs from '@rollup/plugin-commonjs';
import ts from '@rollup/plugin-typescript';
import { resolveRootPackage } from '@run-z/npk';
import { defineConfig } from 'rollup';
import flatDts from 'rollup-plugin-flat-dts';
import unbundle from 'rollup-plugin-unbundle';
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
    {
      name: 'run-z.custom',
      closeBundle() {
        resolutionRoot = undefined;
      },
    },
    unbundle({
      resolutionRoot: getResolutionRoot,
    }),
    commonjs(),
    ts({
      typescript,
      tsconfig: 'tsconfig.main.json',
      cacheDir: 'target/.rts_cache',
    }),
  ],
  output: {
    format: 'esm',
    sourcemap: true,
    dir: '.',
    entryFileNames: 'dist/[name].js',
    chunkFileNames: 'dist/_[name].js',
    // FIXME: `manualChunks` causes errors
    // manualChunks(id) {
    //   const module = resolutionRoot.resolveImport(id);
    //   const host = module.host;

    //   if (host) {
    //     const { scope, name } = host.packageInfo;

    //     if (scope) {
    //       return `dep/${name.slice(1)}`;
    //     }
    //     if (name === 'run-z') {
    //       const path = module.uri.slice(host.uri.length + 1);

    //       if (path.startsWith('src/builtins/')) {
    //         return 'run-z.builtins';
    //       }
    //       if (path.startsWith('src/cli/')) {
    //         return 'run-z.cli';
    //       }
    //       if (path.startsWith('src/core/')) {
    //         return 'run-z.core';
    //       }
    //       if (path.startsWith('src/os/')) {
    //         return 'run-z.os';
    //       }
    //     } else {
    //       return `dep/${name}`;
    //     }
    //   }

    //   return 'run-z.common';
    // },
    plugins: [
      flatDts({
        tsconfig: 'tsconfig.main.json',
        lib: true,
        file: './dist/run-z.d.ts',
        compilerOptions: {
          declarationMap: true,
        },
        entries: {
          builtins: {
            file: './dist/run-z.builtins.d.ts',
          },
        },
        internal: ['**/impl/**', '**/*.impl.ts'],
      }),
    ],
  },
});

let resolutionRoot;

async function getResolutionRoot() {
  return (resolutionRoot ??= await resolveRootPackage());
}

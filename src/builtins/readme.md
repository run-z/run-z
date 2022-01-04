# Built-in extensions

These are the built-in extensions of `run-z`.

Think of "built-in extensions" like command line arguments.

By running the npm script `build`, these will be transformed into `<project_root>/dist/run-z.builtins.js`.

## Examples

### `help.builtin.ts`

This file implements the functionality to print help information.

```shell
npm run-z --help
yarn run-z --help
pnpm run-z --help
# Will print detailed help information.
```

### `all-batch.builtin.ts`

This file implements the functionality to execute takes across all named batches.

```shell
npm run run-z -- build --all
yarn run-z build --all
pnpm run-z build -- --all
# Will execute task "build" across all named batches.
```

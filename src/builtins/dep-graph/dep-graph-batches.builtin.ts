/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZExtension, ZTaskOption } from '../../core';
import { ZBatcher } from '../../core';
import { ZDepGraphBatches } from './dep-graph-batches.rule';

/**
 * Dependency graph batches execution built-in extension.
 *
 * Supports `--with-deps`, `--only-deps`, `--with-dependants`, and `--only-dependants` options.
 *
 * Re-enables task batching disregarding dependency graph when `--all` option specified.
 */
export const ZDepGraphBatchesBuiltin: ZExtension = {
  options: {
    '--with-deps': readZDepGraphBatches.bind(undefined, 'dependencies', true),
    '--only-deps': readZDepGraphBatches.bind(undefined, 'dependencies', false),
    '--with-dependants': readZDepGraphBatches.bind(undefined, 'dependants', true),
    '--only-dependants': readZDepGraphBatches.bind(undefined, 'dependants', false),
    '--all'(option) {
      option.defer(() => {
        option.setBatching(
            option.batching.rule(ZDepGraphBatches).disable(),
        );
      });
    },
  },
};

/**
 * @internal
 */
function readZDepGraphBatches(
    included: 'dependencies' | 'dependants',
    includeSelf: boolean,
    option: ZTaskOption,
): void {
  option.setBatching(
      option.batching
          .batchBy(ZBatcher.topmost())
          .rule(ZDepGraphBatches).include(included, includeSelf),
  );
  option.values(0);
}

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
    '--with-deps': {
      read: readZDepGraphBatches.bind(undefined, 'dependencies', true),
      meta: {
        group: '!builtin:batch',
        help: 'Execute tasks in each package the current one depends on, then in current package',
      },
    },
    '--only-deps': {
      read: readZDepGraphBatches.bind(undefined, 'dependencies', false),
      meta: {
        group: '!builtin:batch',
        help: 'Execute tasks in each package the current one depends on. Skip current package',
      },
    },
    '--with-dependants': {
      read: readZDepGraphBatches.bind(undefined, 'dependants', true),
      meta: {
        group: '!builtin:batch',
        help: 'Execute tasks in current package, then in each package depending on it',
      },
    },
    '--only-dependants': {
      read: readZDepGraphBatches.bind(undefined, 'dependants', false),
      meta: {
        group: '!builtin:batch',
        help: 'Execute tasks in each package depending on current one. Skip current package',
      },
    },
    '--all'(option) {
      option.defer(() => {
        option.setBatching(option.batching.rule(ZDepGraphBatches).disable());
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
      .batchByDefault(ZBatcher.topmost())
      .rule(ZDepGraphBatches)
      .include(included, includeSelf),
  );
  option.values(0);
}

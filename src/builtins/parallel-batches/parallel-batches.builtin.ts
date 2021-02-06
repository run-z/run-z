import type { ZExtension, ZTaskOption } from '../../core';
import { ZParallelBatches } from './parallel-batches.rule';

/**
 * Parallel batch execution built-in extension.
 *
 * Supports `--batch-parallel` (`--bap`) and `--batch-sequential` (`--bas`) options.
 */
export const ZParallelBatchesBuiltin: ZExtension = {
  options: {
    '--batch-parallel': {
      read: readZBatchParallel.bind(undefined, true),
      meta: {
        group: '!builtin:batch',
        help: 'Execute batched tasks in parallel to each other',
      },
    },
    '--bap': {
      read: readZBatchParallel.bind(undefined, true),
      meta: {
        aliasOf: '--batch-parallel',
      },
    },
    '--batch-sequential': {
      read: readZBatchParallel.bind(undefined, false),
      meta: {
        group: '!builtin:batch',
        help: 'Execute batched tasks sequentially',
      },
    },
    '--bas': {
      read: readZBatchParallel.bind(undefined, false),
      meta: {
        aliasOf: '--batch-sequential',
      },
    },
  },
};

/**
 * @internal
 */
function readZBatchParallel(parallel: boolean, option: ZTaskOption): void {
  option.setBatching(option.batching.rule(ZParallelBatches).makeParallel(parallel));
  option.values(0);
}

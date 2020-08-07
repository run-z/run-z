/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZExtension, ZTaskOption } from '../../core';
import { ZParallelBatches } from './parallel-batches.rule';

/**
 * Parallel batch execution built-in extension.
 *
 * Supports `--batch-parallel` (`--bap`) and `--batch-sequential` (`--bas`) options.
 */
export const ZParallelBatchesBuiltin: ZExtension = {
  options: {
    '--batch-parallel': readZBatchParallel.bind(undefined, true),
    '--bap': readZBatchParallel.bind(undefined, true),
    '--batch-sequential': readZBatchParallel.bind(undefined, false),
    '--bas': readZBatchParallel.bind(undefined, false),
  },
};

/**
 * @internal
 */
function readZBatchParallel(parallel: boolean, option: ZTaskOption): void {
  option.setBatching(option.batching.rule(ZParallelBatches).makeParallel(parallel));
  option.values(0);
}

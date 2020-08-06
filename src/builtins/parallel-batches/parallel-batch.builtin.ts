/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZExtension, ZTaskOption } from '../../core';
import { ZParallelBatch } from './parallel-batch.rule';

/**
 * Parallel batch execution built-in extension.
 *
 * Supports `--parallel-batch` (`--pbatch`) and `--sequential-batch` (`--sbatch`) options.
 */
export const ZParallelBatchBuiltin: ZExtension = {
  options: {
    '--parallel-batch': readParallelZBatch.bind(undefined, true),
    '--pbatch': readParallelZBatch.bind(undefined, true),
    '--sequential-batch': readParallelZBatch.bind(undefined, false),
    '--sbatch': readParallelZBatch.bind(undefined, false),
  },
};

/**
 * @internal
 */
function readParallelZBatch(parallel: boolean, option: ZTaskOption): void {
  option.setBatching(option.batching.rule(ZParallelBatch).makeParallel(parallel));
  option.values(0);
}

/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZExtension } from '../core';
import { ZBatcher } from '../core';

/**
 * All named batches execution built-in extension.
 *
 * Supports `--all` option.
 */
export const ZAllBatchBuiltin: ZExtension = {
  options: {
    '--all'(option) {
      option.setBatching(option.batching.batchBy(ZBatcher.topmost()));
      option.values(0);
    },
  },
};

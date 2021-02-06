import type { ZExtension } from '../core';
import { ZBatcher } from '../core';

/**
 * All named batches execution built-in extension.
 *
 * Supports `--all` option.
 */
export const ZAllBatchBuiltin: ZExtension = {
  options: {
    '--all': {
      read(option) {
        option.setBatching(option.batching.batchBy(ZBatcher.topmost()));
        option.values(0);
      },
      meta: {
        group: '!builtin:batch',
        help: 'Execute tasks in named batches',
      },
    },
  },
};

import { describe, expect, it } from '@jest/globals';
import { ZBatchDetails } from './batch-details.js';
import { ZBatching } from './batching.js';
import { ZBatcher } from './batcher.js';

describe('ZBatchDetails', () => {
  describe('by', () => {
    it('reconstructs undefined batcher', () => {
      const full = ZBatchDetails.by();

      expect(full.batching).toBeInstanceOf(ZBatching);
    });
    it('preserves specified batcher', () => {
      const batching = ZBatching.newBatching(ZBatcher.batchTask);
      const full = ZBatchDetails.by({ batching });

      expect(full.batching).toBe(batching);
    });
  });
});

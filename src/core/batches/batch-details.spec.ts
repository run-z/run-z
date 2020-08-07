import { ZBatchDetails } from './batch-details';
import { ZBatcher } from './batcher';
import { ZBatching } from './batching';

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

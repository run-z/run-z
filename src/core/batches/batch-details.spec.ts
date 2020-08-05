import { ZBatchDetails } from './batch-details';
import { ZBatcher } from './batcher';

describe('ZBatchDetails', () => {
  describe('by', () => {
    it('removes undefined batcher', () => {

      const full = ZBatchDetails.by({ batcher: undefined });

      expect(full).not.toHaveProperty('batcher');
    });
    it('preserves specified batcher', () => {

      const batcher = ZBatcher.batchTask;
      const full = ZBatchDetails.by({ batcher });

      expect(full.batcher).toBe(batcher);
    });
  });
});

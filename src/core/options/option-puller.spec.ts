import type { ZOptionInput } from './option-input';
import { ZOptionPuller } from './option-puller';

describe('ZOptionPuller', () => {
  describe('by', () => {
    it('returns the same puller', () => {
      expect(ZOptionPuller.by(ZOptionPuller.short)).toBe(ZOptionPuller.short);
    });
    it('combines pullers', () => {

      const input1: ZOptionInput = { name: '1' };
      const puller1: ZOptionPuller = () => [input1];
      const input2: ZOptionInput = { name: '2' };
      const puller2:ZOptionPuller = () => [input2];
      const combined = ZOptionPuller.by([puller1, puller2]);

      expect([...combined(['foo', 'bar'])]).toEqual([input1, input2]);
    });
    it('de-duplicates option inputs', () => {

      const input1: ZOptionInput = { name: '1' };
      const input2: ZOptionInput = { name: '2' };
      const input3: ZOptionInput = { name: '3' };

      const puller1: ZOptionPuller = () => [input1, input2];
      const puller2:ZOptionPuller = () => [input2, input3];
      const combined = ZOptionPuller.by([puller1, puller2]);

      expect([...combined(['foo', 'bar'])]).toEqual([input1, input2, input3]);
    });
  });
});

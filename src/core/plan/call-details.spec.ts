import { valueProvider } from '@proc7ts/primitives';
import { ZCallDetails } from './call-details';
import { ZTaskParams } from './task-params';

describe('ZCallDetails', () => {
  describe('by', () => {
    it('reconstructs parameters', () => {

      const params = ZCallDetails.by().params(ZTaskParams.newEvaluator());

      expect(params.attrs).toEqual({});
      expect(params.args).toEqual([]);
    });
    it('respects parameters', () => {

      const params = ZCallDetails.by({
        params: valueProvider({
          attrs: { attr: ['1'] },
          args: ['arg'],
        }),
      }).params(ZTaskParams.newEvaluator());

      expect(params.attrs).toEqual({ attr: ['1'] });
      expect(params.args).toEqual(['arg']);
    });
    it('reconstructs plan', async () => {
      expect(await (ZCallDetails.by() as any).plan()).toBeUndefined();
    });
    it('respects plan', async () => {

      const planner = { name: 'planner' } as any;
      const plan = jest.fn();

      await ZCallDetails.by({ plan }).plan(planner);

      expect(plan).toHaveBeenCalledWith(planner);
    });
  });
});

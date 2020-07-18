import { asis, valueProvider } from '@proc7ts/primitives';
import { TestPlan } from '../../../spec';
import { UnknownZTaskError } from '../unknown-task-error';
import { UnknownZTask } from './unknown.task';

describe('UnknownZTask', () => {

  let testPlan: TestPlan;

  beforeEach(() => {
    testPlan = new TestPlan();
  });

  it('is constructed by default', async () => {

    const call = await testPlan.plan('absent');

    expect(call.task).toBeInstanceOf(UnknownZTask);
  });

  describe('exec', () => {
    it('throws when absent', async () => {

      const call = await testPlan.plan('absent');

      expect(await call.exec().whenDone().catch(asis)).toBeInstanceOf(UnknownZTaskError);
    });
    it('does not throw when called with `if-present` attribute', async () => {

      const call = await testPlan.plan(
          'absent',
          {
            async plan(planner) {
              await planner.call({
                task: planner.plannedCall.task,
                params: valueProvider({ attrs: { 'if-present': ['on'] } }),
              });
            },
          },
      );

      expect(await call.exec().whenDone()).toBeUndefined();
    });
  });
});

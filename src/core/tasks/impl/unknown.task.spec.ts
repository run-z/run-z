import { TestPlan } from '../../../spec';
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
});

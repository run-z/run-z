import { TestPlan } from '../../spec';
import { UnknownZTask } from './impl';
import { ZTaskSpec } from './task-spec';

describe('ZTaskFactory', () => {

  let testPlan: TestPlan;

  beforeEach(() => {
    testPlan = new TestPlan();
  });

  it('constructs unknown task by default', async () => {

    const target = await testPlan.target();
    const task = testPlan.setup.taskFactory.createTask(
        target,
        'test',
        {
          deps: [],
          attrs: {},
          args: [],
          action: { type: 'wrong' } as any,
        },
    );

    expect(task.spec).toBe(ZTaskSpec.unknown);
    expect(task).toBeInstanceOf(UnknownZTask);
  });
  it('constructs unknown task for unknown spec', async () => {

    const target = await testPlan.target();
    const task = testPlan.setup.taskFactory.createTask(target, 'test', ZTaskSpec.unknown);

    expect(task.spec).toBe(ZTaskSpec.unknown);
    expect(task).toBeInstanceOf(UnknownZTask);
  });
});

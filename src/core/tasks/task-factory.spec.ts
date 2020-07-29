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
    const task = testPlan.setup.taskFactory.newTask(target, 'test').setAction({ type: 'wrong' } as any).task();

    expect(task.spec.action).toBe(ZTaskSpec.unknownAction);
    expect(task).toBeInstanceOf(UnknownZTask);
  });
  it('constructs unknown task for unknown spec', async () => {

    const target = await testPlan.target();
    const task = testPlan.setup.taskFactory.newTask(target, 'test').setAction(ZTaskSpec.unknownAction).task();

    expect(task.spec.action).toBe(ZTaskSpec.unknownAction);
    expect(task).toBeInstanceOf(UnknownZTask);
  });
});
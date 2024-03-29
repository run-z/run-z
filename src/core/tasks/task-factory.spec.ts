import { beforeEach, describe, expect, it } from '@jest/globals';
import { TestPlan } from '../../spec/test-plan.js';
import { GroupZTask } from './impl/group.task.js';
import { UnknownZTask } from './impl/unknown.task.js';
import { ZTaskSpec } from './task-spec.js';

describe('ZTaskFactory', () => {
  let testPlan: TestPlan;

  beforeEach(() => {
    testPlan = new TestPlan();
  });

  it('constructs grouping task by default', async () => {
    const target = await testPlan.target();
    const task = testPlan.setup.taskFactory.newTask(target, 'test').task();

    expect(task.spec.action).toEqual({ type: 'group', targets: [] });
    expect(task).toBeInstanceOf(GroupZTask);
  });
  it('constructs unknown task for illegal spec', async () => {
    const target = await testPlan.target();
    const task = testPlan.setup.taskFactory
      .newTask(target, 'test')
      .setAction({ type: 'wrong' } as any)
      .task();

    expect(task.spec.action).toBe(ZTaskSpec.unknownAction);
    expect(task).toBeInstanceOf(UnknownZTask);
  });
  it('constructs unknown task for unknown spec', async () => {
    const target = await testPlan.target();
    const task = testPlan.setup.taskFactory
      .newTask(target, 'test')
      .setAction(ZTaskSpec.unknownAction)
      .task();

    expect(task.spec.action).toBe(ZTaskSpec.unknownAction);
    expect(task).toBeInstanceOf(UnknownZTask);
  });
});

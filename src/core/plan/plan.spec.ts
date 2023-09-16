import { beforeEach, describe, expect, it } from '@jest/globals';
import { TestPlan } from '../../spec/test-plan.js';
import { ZCall } from './call.js';
import { ZPlan } from './plan.js';
import { ZTaskParams } from './task-params.js';
import { prerequisitesOf, taskIds } from '../../spec/task-id.js';

describe('ZPlan', () => {
  let testPlan: TestPlan;
  let call: ZCall;
  let plan: ZPlan;

  beforeEach(async () => {
    testPlan = new TestPlan('root', { packageJson: { scripts: { test: 'test', other: 'other' } } });
    call = await testPlan.call('test');
    plan = call.plan;
  });

  describe('calls', () => {
    it('contains task call', () => {
      expect([...plan.calls()]).toEqual([call]);
    });
  });

  describe('callOf', () => {
    it('throws when non-called task requested', async () => {
      const otherTask = await call.task.target.task('other');

      expect(() => plan.callOf(otherTask)).toThrow(
        new TypeError('Task "other" from <root> is never called'),
      );
    });
  });

  it('extends task call parameters', async () => {
    testPlan.addPackage('test', {
      packageJson: {
        scripts: {
          test: 'run-z attr=0 dep2/attr=1/--arg1 dep1',
          dep1: 'run-z dep2/attr=2/--arg2',
          dep2: 'run-z --then exec',
        },
      },
    });

    const call = await testPlan.call('test');
    const target = call.task.target;

    plan = call.plan;

    const dep1 = plan.callOf(await target.task('dep1'));
    const dep2 = plan.callOf(await target.task('dep2'));

    expect(dep1.params(ZTaskParams.newEvaluator()).args).toHaveLength(0);
    expect(dep1.params(ZTaskParams.newEvaluator()).attrs).toEqual({ attr: ['0'] });
    expect(dep2.params(ZTaskParams.newEvaluator()).args).toEqual(['--arg2', '--arg1']);
    expect(dep2.params(ZTaskParams.newEvaluator()).attr('attr')).toBe('1');
  });
  it('ignores never called prerequisites', async () => {
    testPlan.addPackage('test', {
      packageJson: {
        scripts: {
          test: 'run-z dep2',
          dep1: 'run-z dep2',
          dep2: 'run-z --then exec',
        },
      },
    });

    const call = await testPlan.call('test', {
      async plan(planner) {
        const { task } = planner.plannedCall;
        const dep1 = await task.target.task('dep1');

        planner.order(dep1, task);
      },
    });
    const target = call.task.target;

    plan = call.plan;

    const dep2 = plan.callOf(await target.task('dep2'));

    expect(prerequisitesOf(call)).toEqual(taskIds(dep2));
  });
  it('allows explicit parallel execution', async () => {
    testPlan.addPackage('test', {
      packageJson: {
        scripts: {
          test: 'run-z dep1,dep2',
          dep1: 'exec1',
          dep2: 'exec2',
        },
      },
    });

    const call = await testPlan.call('test', {
      async plan(planner) {
        const { task } = planner.plannedCall;
        const dep1 = await task.target.task('dep1');
        const dep2 = await task.target.task('dep2');

        planner.makeParallel([task, dep1, dep2]);
      },
    });
    const target = call.task.target;

    plan = call.plan;

    const dep1 = await target.task('dep1');
    const dep2 = await target.task('dep2');

    expect(call.isParallelTo(dep1)).toBe(true);
    expect(call.isParallelTo(dep2)).toBe(true);
    expect(plan.callOf(dep1).isParallelTo(dep2)).toBe(true);
  });
  it('orders task execution', async () => {
    testPlan.addPackage('test', {
      packageJson: {
        scripts: {
          test: 'run-z dep3 dep1',
          dep1: 'run-z dep2',
          dep2: 'exec2',
          dep3: 'exec3',
        },
      },
    });

    const call = await testPlan.call('test');
    const target = call.task.target;

    plan = call.plan;

    const dep1 = plan.callOf(await target.task('dep1'));
    const dep2 = plan.callOf(await target.task('dep2'));
    const dep3 = plan.callOf(await target.task('dep3'));

    expect(prerequisitesOf(call)).toEqual(taskIds(dep3, dep1));
    expect(call.hasPrerequisite(dep1.task)).toBe(true);
    expect(call.hasPrerequisite(dep2.task)).toBe(true);
    expect(call.hasPrerequisite(dep3.task)).toBe(true);

    expect(prerequisitesOf(dep1)).toEqual(taskIds(dep2));
    expect(dep1.hasPrerequisite(call.task)).toBe(false);
    expect(dep1.hasPrerequisite(dep2.task)).toBe(true);
    expect(dep1.hasPrerequisite(dep3.task)).toBe(true);

    expect(prerequisitesOf(dep2)).toEqual(taskIds(dep3));
    expect(dep2.hasPrerequisite(call.task)).toBe(false);
    expect(dep2.hasPrerequisite(dep1.task)).toBe(false);
    expect(dep2.hasPrerequisite(dep3.task)).toBe(true);

    expect(prerequisitesOf(dep3)).toHaveLength(0);
  });
  it('orders recurrent task execution', async () => {
    testPlan.addPackage('test', {
      packageJson: {
        scripts: {
          test: 'run-z dep1 dep2',
          dep1: 'run-z dep2',
          dep2: 'exec',
        },
      },
    });

    const call = await testPlan.call('test');
    const target = call.task.target;

    plan = call.plan;

    const dep1 = plan.callOf(await target.task('dep1'));
    const dep2 = plan.callOf(await target.task('dep2'));

    expect(prerequisitesOf(call)).toEqual(taskIds(dep1, dep2));
    expect(call.hasPrerequisite(dep1.task)).toBe(true);
    expect(call.hasPrerequisite(dep2.task)).toBe(true);

    expect(prerequisitesOf(dep1)).toEqual(taskIds(dep2));
    expect(dep1.hasPrerequisite(dep2.task)).toBe(true);
    expect(dep1.hasPrerequisite(call.task)).toBe(false);

    expect(prerequisitesOf(dep2)).toEqual(taskIds(dep1));
    expect(dep2.hasPrerequisite(dep1.task)).toBe(true);
    expect(dep2.hasPrerequisite(call.task)).toBe(false);
  });
});

import { TestPlan } from '../../spec';
import { UnknownZTaskError } from '../tasks';
import type { ZCall } from './call';
import type { ZPlan } from './plan';

describe('ZPlan', () => {

  let testPlan: TestPlan;
  let call: ZCall;
  let plan: ZPlan;

  beforeEach(async () => {
    testPlan = new TestPlan('root', { scripts: { test: 'test', other: 'other' } });
    call = await testPlan.plan('test');
    plan = call.plan;
  });

  describe('calls', () => {
    it('contains task call', () => {
      expect([...plan.calls()]).toEqual([call]);
    });
  });

  describe('callOf', () => {
    it('throws when non-called task requested', () => {

      const otherTask = call.task.target.task('other');

      expect(() => plan.callOf(otherTask)).toThrow(UnknownZTaskError);
    });
  });

  it('extends task call parameters', async () => {
    testPlan.addPackage(
        'test',
        {
          scripts: {
            test: 'run-z attr=0 dep2/attr=1/--arg1 dep1',
            dep1: 'run-z dep2/attr=2/--arg2',
            dep2: 'run-z --then exec',
          },
        },
    );

    const call = await testPlan.plan('test');
    const target = call.task.target;

    plan = call.plan;

    const dep1 = plan.callOf(target.task('dep1'));
    const dep2 = plan.callOf(target.task('dep2'));

    expect(dep1.params().args).toHaveLength(0);
    expect(dep1.params().attrs).toEqual({ attr: ['0'] });
    expect(dep2.params().args).toEqual(['--arg2', '--arg1']);
    expect(dep2.params().attr('attr')).toBe('1');
  });
  it('ignores never called dependencies', async () => {
    testPlan.addPackage(
        'test',
        {
          scripts: {
            test: 'run-z dep2',
            dep1: 'run-z dep2',
            dep2: 'run-z --then exec',
          },
        },
    );

    const call = await testPlan.plan(
        'test',
        {
          plan(planner) {

            const { task } = planner.plannedCall;
            const dep1 = task.target.task('dep1');

            planner.require(task, dep1);
          },
        },
    );
    const target = call.task.target;

    plan = call.plan;

    const dep2 = plan.callOf(target.task('dep2'));

    expect([...call.required()]).toEqual([dep2]);
  });
  it('allows explicit parallel execution', async () => {
    testPlan.addPackage(
        'test',
        {
          scripts: {
            test: 'run-z dep1,dep2',
            dep1: 'exec1',
            dep2: 'exec2',
          },
        },
    );

    const call = await testPlan.plan(
        'test',
        {
          plan(planner) {

            const { task } = planner.plannedCall;
            const dep1 = task.target.task('dep1');
            const dep2 = task.target.task('dep2');

            planner.makeParallel([task, dep1, dep2]);
          },
        },
    );
    const target = call.task.target;

    plan = call.plan;

    const dep1 = target.task('dep1');
    const dep2 = target.task('dep2');

    expect(call.parallelWith(dep1)).toBe(true);
    expect(call.parallelWith(dep2)).toBe(true);
    expect(plan.callOf(dep1).parallelWith(dep2)).toBe(true);
  });
});

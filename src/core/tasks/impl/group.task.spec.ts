import { asis } from '@proc7ts/primitives';
import { ZOptionError } from '@run-z/optionz';
import { prerequisitesOf, taskId, taskIds, TestPlan } from '../../../spec';
import { ZShell } from '../../jobs';
import { ZTaskParams } from '../../plan';
import { GroupZTask } from './group.task';

describe('GroupZTask', () => {

  let testPlan: TestPlan;

  beforeEach(() => {
    testPlan = new TestPlan();
  });

  it('calls prerequisites', async () => {
    testPlan.addPackage(
        'test',
        {
          packageJson: {
            scripts: {
              test: 'run-z dep1 test=1',
              dep1: 'run-z dep2 dep1=2',
              dep2: 'run-z --then exec2',
            },
          },
        },
    );

    const call = await testPlan.call('test');

    expect(call.task).toBeInstanceOf(GroupZTask);

    const plan = call.plan;
    const target = call.task.target;
    const dep1 = plan.callOf(await target.task('dep1'));
    const dep2 = plan.callOf(await target.task('dep2'));

    expect(prerequisitesOf(call)).toEqual(taskIds(dep1));
    expect(call.params(ZTaskParams.newEvaluator()).attrs).toEqual({
      test: ['1'],
    });

    expect(prerequisitesOf(dep1)).toEqual(taskIds(dep2));
    expect(dep1.params(ZTaskParams.newEvaluator()).attrs).toEqual({
      test: ['1'],
      dep1: ['2'],
    });

    expect(prerequisitesOf(dep2)).toHaveLength(0);
    expect(dep2.params(ZTaskParams.newEvaluator()).attrs).toEqual({
      test: ['1'],
      dep1: ['2'],
    });
  });

  it('calls sub-tasks', async () => {
    testPlan.addPackage(
        'test',
        {
          packageJson: {
            scripts: {
              test: 'run-z dep1/dep3/=attr1 =attr2',
              dep1: 'run-z dep2 attr2=off',
              dep2: 'run-z --then exec2',
              dep3: 'run-z dep1 --then exec3',
            },
          },
        },
    );

    const call = await testPlan.call('test');
    const plan = call.plan;
    const target = call.task.target;
    const dep1 = plan.callOf(await target.task('dep1'));
    const dep2 = plan.callOf(await target.task('dep2'));
    const dep3 = plan.callOf(await target.task('dep3'));

    expect(prerequisitesOf(call)).toEqual(taskIds(dep3));
    expect(call.params(ZTaskParams.newEvaluator()).attrs).toEqual({
      attr2: ['on'],
    });

    expect(prerequisitesOf(dep1)).toEqual(taskIds(dep2));
    expect(dep1.params(ZTaskParams.newEvaluator()).attrs).toEqual({
      attr1: ['on'],
      attr2: ['off', 'on', 'on'],
    });

    expect(prerequisitesOf(dep2)).toHaveLength(0);
    expect(dep2.params(ZTaskParams.newEvaluator()).attrs).toEqual({
      attr1: ['on'],
      attr2: ['off', 'on', 'on'],
    });

    expect(prerequisitesOf(dep3)).toEqual(taskIds(dep1));
    expect(dep3.params(ZTaskParams.newEvaluator()).attrs).toEqual({
      attr1: ['on'],
      attr2: ['on', 'off', 'on'],
    });
  });

  it('does not order sub-task annexes', async () => {
    testPlan.addPackage(
        'test',
        {
          packageJson: {
            scripts: {
              test: 'run-z +dep1/dep3/=attr1 =attr2',
              dep1: 'run-z dep2 attr2=off',
              dep2: 'run-z --then exec2',
              dep3: 'run-z --then exec3',
            },
          },
        },
    );

    const call = await testPlan.call('test');
    const plan = call.plan;
    const target = call.task.target;
    const dep1 = plan.callOf(await target.task('dep1'));
    const dep2 = plan.callOf(await target.task('dep2'));
    const dep3 = plan.callOf(await target.task('dep3'));

    expect(prerequisitesOf(call)).toHaveLength(0);
    expect(call.params(ZTaskParams.newEvaluator()).attrs).toEqual({ attr2: ['on'] });

    expect(prerequisitesOf(dep1)).toEqual(taskIds(dep2));
    expect(dep1.params(ZTaskParams.newEvaluator()).attrs).toEqual({ attr2: ['off', 'on'] });

    expect(prerequisitesOf(dep2)).toHaveLength(0);
    expect(dep2.params(ZTaskParams.newEvaluator()).attrs).toEqual({ attr2: ['off', 'on'] });

    expect(prerequisitesOf(dep3)).toHaveLength(0);
    expect(dep3.params(ZTaskParams.newEvaluator()).attrs).toEqual({ attr1: ['on'], attr2: ['on', 'off', 'on'] });
  });

  it('calls external prerequisites', async () => {

    const target = testPlan.addPackage(
        'test',
        {
          packageJson: {
            scripts: {
              test: 'run-z ./nested// dep1/=attr1 dep2/=attr2 =test',
            },
          },
        },
    );

    testPlan.addPackage(
        'test/nested/nested1',
        {
          packageJson: {
            scripts: {
              dep1: 'run-z dep=1.1 --then exec11',
              dep2: 'run-z dep=1.2 --then exec12',
            },
          },
        },
    );

    const nested1 = await testPlan.target();

    testPlan.addPackage(
        'test/nested/nested2',
        {
          packageJson: {
            scripts: {
              dep1: 'run-z dep=2.1 --then exec21',
              dep2: 'run-z dep=2.2 --then exec22',
            },
          },
        },
    );

    const nested2 = await testPlan.target();

    await testPlan.target(target);

    const call = await testPlan.call('test');
    const dep11 = await testPlan.callOf(nested1, 'dep1');
    const dep12 = await testPlan.callOf(nested1, 'dep2');
    const dep21 = await testPlan.callOf(nested2, 'dep1');
    const dep22 = await testPlan.callOf(nested2, 'dep2');

    expect(prerequisitesOf(call)).toEqual(taskIds(dep12, dep22));
    expect(call.params(ZTaskParams.newEvaluator()).attrs).toEqual({ test: ['on'] });

    expect(prerequisitesOf(dep11)).toHaveLength(0);
    expect(dep11.params(ZTaskParams.newEvaluator()).attrs).toEqual({ attr1: ['on'], test: ['on'], dep: ['1.1'] });

    expect(prerequisitesOf(dep12)).toEqual(taskIds(dep11, dep21));
    expect(dep12.params(ZTaskParams.newEvaluator()).attrs).toEqual({ attr2: ['on'], test: ['on'], dep: ['1.2'] });

    expect(prerequisitesOf(dep21)).toHaveLength(0);
    expect(dep21.params(ZTaskParams.newEvaluator()).attrs).toEqual({ attr1: ['on'], test: ['on'], dep: ['2.1'] });

    expect(prerequisitesOf(dep22)).toEqual(taskIds(dep11, dep21));
    expect(dep22.params(ZTaskParams.newEvaluator()).attrs).toEqual({ attr2: ['on'], test: ['on'], dep: ['2.2'] });
  });

  it('calls parallel external prerequisites', async () => {

    const target = testPlan.addPackage(
        'test',
        {
          packageJson: {
            scripts: {
              test: 'run-z dep0, ./nested// dep',
              dep0: 'exec',
            },
          },
        },
    );

    testPlan.addPackage(
        'test/nested/nested1',
        {
          packageJson: {
            scripts: {
              dep: 'exec1',
            },
          },
        },
    );

    const nested1 = await testPlan.target();

    testPlan.addPackage(
        'test/nested/nested2',
        {
          packageJson: {
            scripts: {
              dep: 'exec2',
            },
          },
        },
    );

    const nested2 = await testPlan.target();

    await testPlan.target(target);

    const call = await testPlan.call('test');
    const plan = call.plan;
    const dep0 = plan.callOf(await call.task.target.task('dep0'));
    const dep1 = plan.callOf(await nested1.task('dep'));
    const dep2 = plan.callOf(await nested2.task('dep'));

    expect(prerequisitesOf(call)).toEqual(taskIds(dep1, dep2));

    expect(prerequisitesOf(dep1)).toEqual(taskIds(dep0));
    expect(dep1.isParallelTo(dep0.task)).toBe(true);
    expect(dep1.isParallelTo(dep2.task)).toBe(true);

    expect(prerequisitesOf(dep2)).toEqual(taskIds(dep0));
    expect(dep2.isParallelTo(dep0.task)).toBe(true);
    expect(dep2.isParallelTo(dep1.task)).toBe(true);
  });

  it('calls external prerequisites parallel to each other', async () => {

    const target = testPlan.addPackage(
        'test',
        {
          packageJson: {
            scripts: {
              test: 'run-z ./nested// dep, dep',
            },
          },
        },
    );

    testPlan.addPackage(
        'test/nested/nested1',
        {
          packageJson: {
            scripts: {
              dep: 'run-z attr3=1 --then exec1',
            },
          },
        },
    );

    const nested1 = await testPlan.target();

    testPlan.addPackage(
        'test/nested/nested2',
        {
          packageJson: {
            scripts: {
              dep: 'run-z attr3=2 --then exec2',
            },
          },
        },
    );

    const nested2 = await testPlan.target();

    await testPlan.target(target);

    const call = await testPlan.call('test');
    const plan = call.plan;
    const dep1 = plan.callOf(await nested1.task('dep'));
    const dep2 = plan.callOf(await nested2.task('dep'));

    expect(prerequisitesOf(call)).toEqual(taskIds(dep1, dep2));

    expect(prerequisitesOf(dep1)).toEqual(taskIds(dep1, dep2));
    expect(dep1.isParallelTo(dep2.task)).toBe(true);

    expect(prerequisitesOf(dep2)).toEqual(taskIds(dep1, dep2));
    expect(dep2.isParallelTo(dep1.task)).toBe(true);
  });

  it('calls sub-tasks in other packages', async () => {

    const target = testPlan.addPackage(
        'test',
        {
          packageJson: {
            scripts: {
              test: 'run-z =attr1 ./nested// dep/sub-task/=attr2',
            },
          },
        },
    );

    testPlan.addPackage(
        'test/nested/nested1',
        {
          packageJson: {
            scripts: {
              dep: 'run-z . attr3=1',
              'sub-task': 'exec1',
            },
          },
        },
    );

    const nested1 = await testPlan.target();

    testPlan.addPackage(
        'test/nested/nested2',
        {
          packageJson: {
            scripts: {
              dep: 'run-z attr3=2',
              'sub-task': 'exec2',
            },
          },
        },
    );

    const nested2 = await testPlan.target();

    await testPlan.target(target);

    const call = await testPlan.call('test');
    const plan = call.plan;
    const dep1 = plan.callOf(await nested1.task('dep'));
    const sub1 = plan.callOf(await nested1.task('sub-task'));
    const dep2 = plan.callOf(await nested2.task('dep'));
    const sub2 = plan.callOf(await nested2.task('sub-task'));

    const callPre = prerequisitesOf(call);

    expect(callPre).toContainEqual(taskId(sub1));
    expect(callPre).toContainEqual(taskId(sub2));
    expect(call.params(ZTaskParams.newEvaluator()).attrs).toEqual({ attr1: ['on'] });

    expect(prerequisitesOf(dep1)).toHaveLength(0);
    expect(dep1.params(ZTaskParams.newEvaluator()).attrs).toEqual({ attr1: ['on'], attr3: ['1'] });

    expect(prerequisitesOf(sub1)).toEqual(taskIds(dep1));
    expect(sub1.params(ZTaskParams.newEvaluator()).attrs).toEqual({ attr1: ['on', 'on'], attr2: ['on'], attr3: ['1'] });

    expect(prerequisitesOf(dep2)).toHaveLength(0);
    expect(dep2.params(ZTaskParams.newEvaluator()).attrs).toEqual({ attr1: ['on'], attr3: ['2'] });

    expect(prerequisitesOf(sub2)).toEqual(taskIds(dep2));
    expect(sub2.params(ZTaskParams.newEvaluator()).attrs).toEqual({ attr1: ['on', 'on'], attr2: ['on'], attr3: ['2'] });
  });

  it('delegates to sub-tasks in other packages', async () => {

    const targetLocation = testPlan.addPackage(
        'test',
        {
          packageJson: {
            scripts: {
              test: 'run-z =attr1 dep/sub-task/=attr2',
              dep: 'run-z dep2 ./nested/nested1 ./nested/nested2 dep3',
            },
          },
        },
    );

    testPlan.addPackage(
        'test/nested/nested1',
        {
          packageJson: {
            scripts: {
              'sub-task': 'exec1',
            },
          },
        },
    );

    const nested1 = await testPlan.target();

    testPlan.addPackage(
        'test/nested/nested2',
        {
          packageJson: {
            scripts: {
              'sub-task': 'exec2',
            },
          },
        },
    );

    const nested2 = await testPlan.target();

    const target = await testPlan.target(targetLocation);
    const call = await testPlan.call('test');
    const plan = call.plan;
    const dep = plan.callOf(await target.task('dep'));
    const sub1 = plan.callOf(await nested1.task('sub-task'));
    const sub2 = plan.callOf(await nested2.task('sub-task'));

    expect(prerequisitesOf(call)).toEqual(taskIds(sub1, sub2));
    expect(call.params(ZTaskParams.newEvaluator()).attrs).toEqual({
      attr1: ['on'],
    });

    expect(prerequisitesOf(dep)).toEqual([
      { target: 'root/test/nested/nested1', task: 'dep3' },
      { target: 'root/test/nested/nested2', task: 'dep3' },
    ]);
    expect(dep.params(ZTaskParams.newEvaluator()).attrs).toEqual({
      attr1: ['on'],
    });

    expect(prerequisitesOf(sub1)).toEqual(taskIds(dep));
    expect(sub1.params(ZTaskParams.newEvaluator()).attrs).toEqual({
      attr1: ['on', 'on'],
      attr2: ['on'],
    });

    expect(prerequisitesOf(sub2)).toEqual(taskIds(dep));
    expect(sub2.params(ZTaskParams.newEvaluator()).attrs).toEqual({
      attr1: ['on', 'on'],
      attr2: ['on'],
    });
  });
  it('handles recurrent calls', async () => {
    testPlan.addPackage(
        'test',
        {
          packageJson: {
            scripts: {
              test: 'run-z +dep/attr1=top attr2=top',
              dep: 'run-z test/attr1=dep attr2=dep',
            },
          },
        },
    );

    const call = await testPlan.call('test');
    const dep = await testPlan.callOf(call.task.target, 'dep');

    expect(call.params(ZTaskParams.newEvaluator()).attrs).toEqual({
      attr1: ['top', 'dep'],
      attr2: ['top', 'dep'],
    });
    expect(dep.params(ZTaskParams.newEvaluator()).attrs).toEqual({
      attr1: ['dep', 'top'],
      attr2: ['dep', 'top'],
    });
  });
  it('handles deep recurrent calls', async () => {
    testPlan.addPackage(
        'test',
        {
          packageJson: {
            scripts: {
              test: 'run-z +dep1/attr1=top attr2=top',
              dep1: 'run-z dep2/attr1=dep1 attr2=dep1',
              dep2: 'run-z test/attr1=dep2 attr2=dep2',
            },
          },
        },
    );

    const call = await testPlan.call('test');
    const dep1 = await testPlan.callOf(call.task.target, 'dep1');
    const dep2 = await testPlan.callOf(call.task.target, 'dep2');

    expect(call.params(ZTaskParams.newEvaluator()).attrs).toEqual({
      attr1: ['top', 'dep1', 'dep2'],
      attr2: ['top', 'dep2', 'dep1'],
    });
    expect(dep1.params(ZTaskParams.newEvaluator()).attrs).toEqual({
      attr1: ['dep1', 'dep2', 'top'],
      attr2: ['dep1', 'top', 'dep2'],
    });
    expect(dep2.params(ZTaskParams.newEvaluator()).attrs).toEqual({
      attr1: ['dep2', 'top', 'dep1'],
      attr2: ['dep2', 'dep1', 'top'],
    });
  });

  describe('exec', () => {
    it('does nothing', async () => {
      testPlan.addPackage(
          'test',
          {
            packageJson: {
              scripts: {
                test: 'run-z absent/=if-present',
              },
            },
          },
      );

      const call = await testPlan.call('test');

      expect(await call.exec(ZShell.noop(testPlan.setup)).whenDone()).toBeUndefined();
    });
    it('executes prerequisites', async () => {
      testPlan.addPackage(
          'test',
          {
            packageJson: {
              scripts: {
                test: 'run-z dep1,dep2',
                dep1: 'run-z --then exec1',
                dep2: 'run-z --then exec2',
              },
            },
          },
      );

      const call = await testPlan.call('test');

      expect(await call.exec(ZShell.noop(testPlan.setup)).whenDone()).toBeUndefined();
    });
    it('fails when command line argument passed', async () => {
      testPlan.addPackage(
          'test',
          {
            packageJson: {
              scripts: {
                test: 'run-z',
              },
            },
          },
      );

      const call = await testPlan.call(
          'test',
          {
            params() {
              return { args: ['--test'] };
            },
          },
      );

      const error = await call.exec(ZShell.noop(testPlan.setup)).whenDone().catch(asis);

      expect(error).toBeInstanceOf(ZOptionError);
    });
  });
});

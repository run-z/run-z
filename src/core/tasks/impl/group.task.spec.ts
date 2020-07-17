import { prerequisitesOf, taskIds, TestPlan } from '../../../spec';
import { GroupZTask } from './group.task';

describe('GroupZTask', () => {

  let testPlan: TestPlan;

  beforeEach(() => {
    testPlan = new TestPlan();
  });

  it('calls dependencies', async () => {
    testPlan.addPackage(
        'test',
        {
          scripts: {
            test: 'run-z dep1 test=1',
            dep1: 'run-z dep2 dep1=2',
            dep2: 'run-z --then exec2',
          },
        },
    );

    const call = await testPlan.plan('test');

    expect(call.task).toBeInstanceOf(GroupZTask);

    const plan = call.plan;
    const target = call.task.target;
    const dep1 = plan.callOf(target.task('dep1'));
    const dep2 = plan.callOf(target.task('dep2'));

    expect(prerequisitesOf(call)).toEqual(taskIds(dep1));
    expect(call.params().attrs).toEqual({ test: ['1'] });

    expect(prerequisitesOf(dep1)).toEqual(taskIds(dep2));
    expect(dep1.params().attrs).toEqual({ test: ['1'], dep1: ['2'] });

    expect(prerequisitesOf(dep2)).toHaveLength(0);
    expect(dep2.params().attrs).toEqual({ test: ['1'], dep1: ['2'] });
  });

  it('calls sub-tasks', async () => {
    testPlan.addPackage(
        'test',
        {
          scripts: {
            test: 'run-z dep1/dep3/=attr1 =attr2',
            dep1: 'run-z dep2',
            dep2: 'run-z --then exec2',
            dep3: 'run-z --then exec3',
          },
        },
    );

    const call = await testPlan.plan('test');
    const plan = call.plan;
    const target = call.task.target;
    const dep1 = plan.callOf(target.task('dep1'));
    const dep2 = plan.callOf(target.task('dep2'));
    const dep3 = plan.callOf(target.task('dep3'));

    expect(prerequisitesOf(call)).toEqual(taskIds(dep3));
    expect(call.params().attrs).toEqual({ attr2: ['on'] });

    expect(prerequisitesOf(dep1)).toEqual(taskIds(dep2));
    expect(dep1.params().attrs).toEqual({ attr2: ['on'] });

    expect(prerequisitesOf(dep2)).toHaveLength(0);
    expect(dep2.params().attrs).toEqual({ attr2: ['on'] });

    expect(prerequisitesOf(dep3)).toEqual(taskIds(dep1));
    expect(dep3.params().attrs).toEqual({ attr1: ['on'], attr2: ['on'] });
  });

  it('calls dependencies from other packages', async () => {

    const target = testPlan.addPackage(
        'test',
        {
          scripts: {
            test: 'run-z ./nested// dep/=attr1 =attr2',
          },
        },
    );

    testPlan.addPackage(
        'test/nested/nested1',
        {
          scripts: {
            dep: 'run-z attr3=1 --then exec1',
          },
        },
    );

    const nested1 = await testPlan.target();

    testPlan.addPackage(
        'test/nested/nested2',
        {
          scripts: {
            dep: 'run-z attr3=2 --then exec2',
          },
        },
    );

    const nested2 = await testPlan.target();

    await testPlan.target(target);

    const call = await testPlan.plan('test');
    const plan = call.plan;
    const dep1 = plan.callOf(nested1.task('dep'));
    const dep2 = plan.callOf(nested2.task('dep'));

    expect(prerequisitesOf(call)).toEqual(taskIds(dep2));
    expect(call.params().attrs).toEqual({ attr2: ['on'] });

    expect(prerequisitesOf(dep1)).toHaveLength(0);
    expect(dep1.params().attrs).toEqual({ attr1: ['on'], attr2: ['on'], attr3: ['1'] });

    expect(prerequisitesOf(dep2)).toEqual(taskIds(dep1));
    expect(dep2.params().attrs).toEqual({ attr1: ['on'], attr2: ['on'], attr3: ['2'] });
  });

  it('calls sub-tasks in other packages', async () => {

    const target = testPlan.addPackage(
        'test',
        {
          scripts: {
            test: 'run-z =attr1 ./nested// dep/sub-task/=attr2',
          },
        },
    );

    testPlan.addPackage(
        'test/nested/nested1',
        {
          scripts: {
            dep: 'run-z attr3=1',
            'sub-task': 'exec1',
          },
        },
    );

    const nested1 = await testPlan.target();

    testPlan.addPackage(
        'test/nested/nested2',
        {
          scripts: {
            dep: 'run-z attr3=2',
            'sub-task': 'exec2',
          },
        },
    );

    const nested2 = await testPlan.target();

    await testPlan.target(target);

    const call = await testPlan.plan('test');
    const plan = call.plan;
    const dep1 = plan.callOf(nested1.task('dep'));
    const sub1 = plan.callOf(nested1.task('sub-task'));
    const dep2 = plan.callOf(nested2.task('dep'));
    const sub2 = plan.callOf(nested2.task('sub-task'));

    expect(prerequisitesOf(call)).toEqual(taskIds(sub2));
    expect(call.params().attrs).toEqual({ attr1: ['on'] });

    expect(prerequisitesOf(dep1)).toHaveLength(0);
    expect(dep1.params().attrs).toEqual({ attr1: ['on'], attr3: ['1'] });

    expect(prerequisitesOf(sub1)).toEqual(taskIds(dep1));
    expect(sub1.params().attrs).toEqual({ attr1: ['on'], attr2: ['on'] });

    expect(prerequisitesOf(dep2)).toEqual(taskIds(sub1));
    expect(dep2.params().attrs).toEqual({ attr1: ['on'], attr3: ['2'] });

    expect(prerequisitesOf(sub2)).toEqual(taskIds(dep2));
    expect(sub2.params().attrs).toEqual({ attr1: ['on'], attr2: ['on'] });
  });

  it('delegates to sub-tasks in other packages', async () => {

    const targetLocation = testPlan.addPackage(
        'test',
        {
          scripts: {
            test: 'run-z =attr1 dep/sub-task/=attr2',
            dep: 'run-z dep2 ./nested/nested1 ./nested/nested2 dep3',
          },
        },
    );

    testPlan.addPackage(
        'test/nested/nested1',
        {
          scripts: {
            'sub-task': 'exec1',
          },
        },
    );

    const nested1 = await testPlan.target();

    testPlan.addPackage(
        'test/nested/nested2',
        {
          scripts: {
            'sub-task': 'exec2',
          },
        },
    );

    const nested2 = await testPlan.target();

    const target = await testPlan.target(targetLocation);
    const call = await testPlan.plan('test');
    const plan = call.plan;
    const dep = plan.callOf(target.task('dep'));
    const sub1 = plan.callOf(nested1.task('sub-task'));
    const sub2 = plan.callOf(nested2.task('sub-task'));

    expect(prerequisitesOf(call)).toEqual(taskIds(sub1));
    expect(call.params().attrs).toEqual({ attr1: ['on'] });

    expect(prerequisitesOf(dep)).toEqual([{ target: 'nested2', task: 'dep3' }]);
    expect(dep.params().attrs).toEqual({ attr1: ['on'] });

    expect(prerequisitesOf(sub1)).toEqual(taskIds(sub2));
    expect(sub1.params().attrs).toEqual({ attr1: ['on'], attr2: ['on'] });

    expect(prerequisitesOf(sub2)).toEqual(taskIds(dep));
    expect(sub2.params().attrs).toEqual({ attr1: ['on'], attr2: ['on'] });
  });
});

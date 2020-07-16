import { TestPlan } from '../../../spec';
import { CommandZTask } from './command.task';

describe('CommandZTask', () => {

  let testPlan: TestPlan;

  beforeEach(() => {
    testPlan = new TestPlan();
  });

  it('accepts command args', async () => {
    testPlan.addPackage('test', { scripts: { test: 'run-z attr=b --arg --then exec --cmd' } });

    const call = await testPlan.plan('test');
    const params = call.params();

    expect(call.task).toBeInstanceOf(CommandZTask);
    expect(params.args).toEqual(['--arg']);
    expect(params.attrs).toEqual({ attr: ['b'] });
    expect(params.actionArgs).toEqual(['--cmd']);
  });

  it('calls dependencies', async () => {
    testPlan.addPackage(
        'test',
        {
          scripts: {
            test: 'run-z =attr dep --then exec --cmd',
            dep: 'exec',
          },
        },
    );

    const call = await testPlan.plan('test');
    const dep = call.plan.callOf(call.task.target.task('dep'));

    expect([...call.required()]).toEqual([dep]);
    expect(dep.params().attrs).toEqual({ attr: ['on'] });
  });
  it('calls parallel dependencies', async () => {
    testPlan.addPackage(
        'test',
        {
          scripts: {
            test: 'run-z dep1,dep2 --then exec --cmd',
            dep1: 'exec1',
            dep2: 'exec2',
          },
        },
    );

    const call = await testPlan.plan('test');
    const target = call.task.target;
    const plan = call.plan;
    const dep1 = plan.callOf(target.task('dep1'));
    const dep2 = plan.callOf(target.task('dep2'));

    expect([...call.required()]).toEqual([dep1, dep2]);
    expect(call.parallelWith(dep1.task)).toBe(false);

    expect(dep1.parallelWith(dep2.task)).toBe(true);
    expect(dep2.parallelWith(dep1.task)).toBe(true);
  });
  it('executed parallel with dependencies', async () => {
    testPlan.addPackage(
        'test',
        {
          scripts: {
            test: 'run-z dep1 dep2,dep3 --and exec --cmd',
            dep1: 'exec1',
            dep2: 'exec2',
            dep3: 'exec3',
          },
        },
    );

    const call = await testPlan.plan('test');
    const target = call.task.target;
    const plan = call.plan;
    const dep1 = plan.callOf(target.task('dep1'));
    const dep2 = plan.callOf(target.task('dep2'));
    const dep3 = plan.callOf(target.task('dep3'));

    expect([...call.required()]).toEqual([dep1, dep2, dep3]);
    expect(call.parallelWith(dep1.task)).toBe(false);
    expect(call.parallelWith(dep2.task)).toBe(true);
    expect(call.parallelWith(dep3.task)).toBe(true);

    expect(dep1.parallelWith(dep2.task)).toBe(false);
    expect(dep1.parallelWith(dep3.task)).toBe(false);

    expect(dep2.parallelWith(dep3.task)).toBe(true);
    expect(dep2.parallelWith(call.task)).toBe(true);

    expect(dep3.parallelWith(dep2.task)).toBe(true);
    expect(dep3.parallelWith(call.task)).toBe(true);
  });
});

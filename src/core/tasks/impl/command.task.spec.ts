import { prerequisitesOf, taskIds, TestPlan } from '../../../spec';
import type { ZShell } from '../../packages';
import { ZTaskParams } from '../../plan';
import { CommandZTask } from './command.task';

describe('CommandZTask', () => {

  let testPlan: TestPlan;

  beforeEach(() => {
    testPlan = new TestPlan();
  });

  it('accepts command args', async () => {
    testPlan.addPackage(
        'test',
        {
          packageJson: {
            scripts: {
              test: 'run-z attr=b --arg --then exec --cmd',
            },
          },
        },
    );

    const call = await testPlan.plan('test');
    const params = call.params();

    expect(call.task).toBeInstanceOf(CommandZTask);
    expect(params.args).toEqual(['--arg']);
    expect(params.attrs).toEqual({ attr: ['b'] });
    expect(params.actionArgs).toEqual(['--cmd']);
  });

  it('calls prerequisites', async () => {
    testPlan.addPackage(
        'test',
        {
          packageJson: {
            scripts: {
              test: 'run-z =attr dep --then exec --cmd',
              dep: 'exec',
            },
          },
        },
    );

    const call = await testPlan.plan('test');
    const dep = call.plan.callOf(call.task.target.task('dep'));

    expect(prerequisitesOf(call)).toEqual(taskIds([dep]));
    expect(dep.params().attrs).toEqual({ attr: ['on'] });
  });
  it('calls parallel prerequisites', async () => {
    testPlan.addPackage(
        'test',
        {
          packageJson: {
            scripts: {
              test: 'run-z dep1,dep2 --then exec --cmd',
              dep1: 'exec1',
              dep2: 'exec2',
            },
          },
        },
    );

    const call = await testPlan.plan('test');
    const target = call.task.target;
    const plan = call.plan;
    const dep1 = plan.callOf(target.task('dep1'));
    const dep2 = plan.callOf(target.task('dep2'));

    expect(prerequisitesOf(call)).toEqual(taskIds(dep2));
    expect(call.isParallelTo(dep1.task)).toBe(false);

    expect(prerequisitesOf(dep1)).toHaveLength(0);
    expect(dep1.isParallelTo(dep2.task)).toBe(true);

    expect(prerequisitesOf(dep2)).toEqual(taskIds(dep1));
    expect(dep2.isParallelTo(dep1.task)).toBe(true);
  });
  it('executed parallel with prerequisites', async () => {
    testPlan.addPackage(
        'test',
        {
          packageJson: {
            scripts: {
              test: 'run-z dep1 dep2,dep3 --and exec --cmd',
              dep1: 'exec1',
              dep2: 'exec2',
              dep3: 'exec3',
            },
          },
        },
    );

    const call = await testPlan.plan('test');
    const target = call.task.target;
    const plan = call.plan;
    const dep1 = plan.callOf(target.task('dep1'));
    const dep2 = plan.callOf(target.task('dep2'));
    const dep3 = plan.callOf(target.task('dep3'));

    expect(prerequisitesOf(call)).toEqual(taskIds(dep3));
    expect(call.isParallelTo(dep1.task)).toBe(false);
    expect(call.isParallelTo(dep2.task)).toBe(true);
    expect(call.isParallelTo(dep3.task)).toBe(true);

    expect(prerequisitesOf(dep1)).toHaveLength(0);
    expect(dep1.isParallelTo(dep2.task)).toBe(false);
    expect(dep1.isParallelTo(dep3.task)).toBe(false);

    expect(prerequisitesOf(dep2)).toEqual(taskIds(dep1));
    expect(dep2.isParallelTo(dep3.task)).toBe(true);
    expect(dep2.isParallelTo(call.task)).toBe(true);

    expect(prerequisitesOf(dep3)).toEqual(taskIds(dep2));
    expect(dep3.isParallelTo(dep2.task)).toBe(true);
    expect(dep3.isParallelTo(call.task)).toBe(true);
  });

  describe('exec', () => {
    it('executes command', async () => {

      const shell = {
        execCommand: jest.fn(),
      } as jest.Mocked<Partial<ZShell>> as jest.Mocked<ZShell>;

      testPlan.addPackage(
          'test',
          {
            packageJson: {
              scripts: {
                test: 'run-z exec/--arg1 --arg2',
                exec: 'run-z --then start --arg3',
              },
            },
            shell,
          },
      );

      const call = await testPlan.plan('test');

      await call.exec().whenDone();

      expect(shell.execCommand).toHaveBeenCalledWith('start', expect.any(ZTaskParams));

      const params = shell.execCommand.mock.calls[0][1];

      expect(params.args).toEqual(['--arg2', '--arg1']);
      expect(params.actionArgs).toEqual(['--arg3']);
    });
  });
});

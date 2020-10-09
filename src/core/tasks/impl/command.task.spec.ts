import { valueProvider } from '@proc7ts/primitives';
import { execZNoOp } from '@run-z/exec-z';
import { StandardZSetup } from '../../../builtins';
import { prerequisitesOf, taskIds, TestPlan } from '../../../spec';
import type { ZShell } from '../../jobs';
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
              test: 'run-z attr=b --then exec --cmd',
            },
          },
        },
    );

    const call = await testPlan.call('test');
    const params = call.params(ZTaskParams.newEvaluator());

    expect(call.task).toBeInstanceOf(CommandZTask);
    expect(params.args).toEqual(['--cmd']);
    expect(params.attrs).toEqual({ attr: ['b'] });
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

    const call = await testPlan.call('test');
    const dep = call.plan.callOf(await call.task.target.task('dep'));

    expect(prerequisitesOf(call)).toEqual(taskIds(dep));
    expect(dep.params(ZTaskParams.newEvaluator()).attrs).toEqual({ attr: ['on'] });
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

    const call = await testPlan.call('test');
    const target = call.task.target;
    const plan = call.plan;
    const dep1 = plan.callOf(await target.task('dep1'));
    const dep2 = plan.callOf(await target.task('dep2'));

    expect(prerequisitesOf(call)).toEqual(taskIds(dep2));
    expect(call.isParallelTo(dep1.task)).toBe(false);

    expect(prerequisitesOf(dep1)).toHaveLength(0);
    expect(dep1.isParallelTo(dep2.task)).toBe(true);

    expect(prerequisitesOf(dep2)).toEqual(taskIds(dep1));
    expect(dep2.isParallelTo(dep1.task)).toBe(true);
  });

  it('calls parallel prerequisites specified by `+cmd:COMMAND` annex', async () => {
    testPlan.addPackage(
        'test',
        {
          packageJson: {
            scripts: {
              test: 'run-z dep1 dep2 +cmd:exec1,+cmd:exec2 --then exec --cmd',
              dep1: 'run-z --then exec1',
              dep2: 'exec2',
            },
          },
        },
    );

    const call = await testPlan.call('test');
    const target = call.task.target;
    const plan = call.plan;
    const dep1 = plan.callOf(await target.task('dep1'));
    const dep2 = plan.callOf(await target.task('dep2'));

    expect(prerequisitesOf(call)).toEqual(taskIds(dep2));
    expect(call.isParallelTo(dep1.task)).toBe(false);

    expect(prerequisitesOf(dep1)).toHaveLength(0);
    expect(dep1.isParallelTo(dep2.task)).toBe(true);

    expect(prerequisitesOf(dep2)).toEqual(taskIds(dep1));
    expect(dep2.isParallelTo(dep1.task)).toBe(true);
  });

  it('executed in parallel with prerequisites', async () => {
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

    const call = await testPlan.call('test');
    const target = call.task.target;
    const plan = call.plan;
    const dep1 = plan.callOf(await target.task('dep1'));
    const dep2 = plan.callOf(await target.task('dep2'));
    const dep3 = plan.callOf(await target.task('dep3'));

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
        execCommand: jest.fn(execZNoOp),
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
          },
      );

      const call = await testPlan.call('test');

      await call.exec(shell).whenDone();

      expect(shell.execCommand).toHaveBeenCalledWith(
          expect.objectContaining({ call: await testPlan.callOf(call.task.target, 'exec') }),
          'start',
      );

      const { params } = shell.execCommand.mock.calls[0][0];

      expect(params.args).toEqual(['--arg3', '--arg1', '--arg2']);
    });

    it('applies `+cmd:command` annex parameters', async () => {

      const shell = {
        execCommand: jest.fn(execZNoOp),
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
          },
      );

      const call = await testPlan.parse('run-z test +cmd:start/--cmd-arg/cmd=applied');

      await call.exec(shell).whenDone();

      expect(shell.execCommand).toHaveBeenCalledWith(
          expect.objectContaining({ call: await testPlan.callOf(call.task.target, 'exec') }),
          'start',
      );

      const { params } = shell.execCommand.mock.calls[0][0];

      expect(params.args).toEqual(['--cmd-arg', '--arg3', '--arg1', '--arg2']);
      expect(params.attrs).toEqual({
        cmd: ['applied'],
      });
    });

    it('does not execute command when `skip` flag is set', async () => {

      const shell = {
        execCommand: jest.fn(execZNoOp),
      } as jest.Mocked<Partial<ZShell>> as jest.Mocked<ZShell>;

      testPlan.addPackage(
          'test',
          {
            packageJson: {
              scripts: {
                exec: 'run-z --then start --arg3',
              },
            },
          },
      );

      const call = await testPlan.call('exec', { params: valueProvider({ attrs: { skip: ['on'] } }) });

      await call.exec(shell).whenDone();

      expect(shell.execCommand).not.toHaveBeenCalled();
    });

    it('executes by overridden executor', async () => {

      const executor = jest.fn(execZNoOp);

      testPlan = new TestPlan(
          'root',
          {
            setup: new StandardZSetup({
              extensions: {
                options: {
                  '--test'(option) {
                    option.executeBy(executor);
                    option.recognize();
                  },
                },
              },
            }),
          },
      );

      const shell = {
        execCommand: jest.fn(execZNoOp),
      } as jest.Mocked<Partial<ZShell>> as jest.Mocked<ZShell>;

      testPlan.addPackage(
          'test',
          {
            packageJson: {
              scripts: {
                exec: 'run-z --test --then start --arg3',
              },
            },
          },
      );

      const call = await testPlan.call('exec');

      await call.exec(shell).whenDone();

      expect(executor).toHaveBeenCalled();
      expect(shell.execCommand).not.toHaveBeenCalled();
    });
  });
});

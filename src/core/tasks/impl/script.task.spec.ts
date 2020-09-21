import { execZNoOp } from '@run-z/exec-z';
import { TestPlan } from '../../../spec';
import type { ZShell } from '../../jobs';
import { ZTaskParams } from '../../plan';
import { ScriptZTask } from './script.task';

describe('ScriptZTask', () => {

  let testPlan: TestPlan;

  beforeEach(() => {
    testPlan = new TestPlan();
  });

  it('does not contain any parameters', async () => {
    testPlan.addPackage(
        'test',
        {
          packageJson: {
            scripts: {
              test: 'exec --arg',
            },
          },
        },
    );

    const call = await testPlan.call('test');

    expect(call.task).toBeInstanceOf(ScriptZTask);

    const params = call.params(ZTaskParams.newEvaluator());

    expect(params.attrs).toEqual({});
    expect(params.args).toHaveLength(0);
  });

  describe('exec', () => {
    it('executes NPM script', async () => {

      const shell = {
        execScript: jest.fn(execZNoOp),
      } as jest.Mocked<Partial<ZShell>> as jest.Mocked<ZShell>;

      testPlan.addPackage(
          'test',
          {
            packageJson: {
              scripts: {
                test: 'run-z exec/--arg1 --arg2',
                exec: 'start --arg3',
              },
            },
          },
      );

      const call = await testPlan.call('test');

      await call.exec(shell).whenDone();

      expect(shell.execScript).toHaveBeenCalledWith(
          expect.objectContaining({ call: await testPlan.callOf(call.task.target, 'exec') }),
          'exec',
      );

      const { params } = shell.execScript.mock.calls[0][0];

      expect(params.args).toEqual(['--arg1', '--arg2']);
    });

    it('applies `+cmd:command` annex parameters', async () => {

      const shell = {
        execScript: jest.fn(execZNoOp),
      } as jest.Mocked<Partial<ZShell>> as jest.Mocked<ZShell>;

      testPlan.addPackage(
          'test',
          {
            packageJson: {
              scripts: {
                test: 'run-z exec/--arg1 --arg2',
                exec: 'start --arg3',
              },
            },
          },
      );

      const call = await testPlan.parse('run-z test +cmd:start/--cmd-arg/cmd=applied');

      await call.exec(shell).whenDone();

      expect(shell.execScript).toHaveBeenCalledWith(
          expect.objectContaining({ call: await testPlan.callOf(call.task.target, 'exec') }),
          'exec',
      );

      const { params } = shell.execScript.mock.calls[0][0];

      expect(params.args).toEqual(['--cmd-arg', '--arg1', '--arg2']);
      expect(params.attrs).toEqual({
        cmd: ['applied'],
      });
    });

    it('does not apply `+cmd:command` annex parameters to non-parsable command', async () => {

      const shell = {
        execScript: jest.fn(execZNoOp),
      } as jest.Mocked<Partial<ZShell>> as jest.Mocked<ZShell>;

      testPlan.addPackage(
          'test',
          {
            packageJson: {
              scripts: {
                test: 'run-z exec/--arg1 --arg2',
                exec: 'start --arg3 > out',
              },
            },
          },
      );

      const call = await testPlan.parse('run-z test +cmd:start/--cmd-arg/cmd=applied');

      await call.exec(shell).whenDone();

      expect(shell.execScript).toHaveBeenCalledWith(
          expect.objectContaining({ call: await testPlan.callOf(call.task.target, 'exec') }),
          'exec',
      );

      const { params } = shell.execScript.mock.calls[0][0];

      expect(params.args).toEqual(['--arg1', '--arg2']);
      expect(params.attrs).toEqual({});
    });
  });
});

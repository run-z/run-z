import { TestPlan } from '../../../spec';
import type { ZShell } from '../../packages';
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

    const call = await testPlan.plan('test');

    expect(call.task).toBeInstanceOf(ScriptZTask);

    const params = call.params();

    expect(params.attrs).toEqual({});
    expect(params.args).toHaveLength(0);
  });

  describe('exec', () => {
    it('executes NPM script', async () => {

      const shell = {
        execScript: jest.fn(),
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
            shell,
          },
      );

      const call = await testPlan.plan('test');

      await call.exec().whenDone();

      expect(shell.execScript).toHaveBeenCalledWith('exec', expect.any(ZTaskParams));

      const params = shell.execScript.mock.calls[0][1];

      expect(params.args).toEqual(['--arg1', '--arg2']);
    });
  });
});

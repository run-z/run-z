import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { asis, noop } from '@proc7ts/primitives';
import { execZNoOp } from '@run-z/exec-z';
import { ZOptionError } from '@run-z/optionz';
import { ZShell } from '../core/jobs/shell.js';
import { ZSetup } from '../core/setup.js';
import { SystemZShell } from '../os/system-shell.js';
import { TestPlan } from '../spec/test-plan.js';
import { ZHelpBuiltin } from './help.builtin.js';

describe('ZHelpBuiltin', () => {
  let testPlan: TestPlan;
  let shell: ZShell;

  beforeEach(() => {
    testPlan = new TestPlan();
    shell = new SystemZShell(testPlan.setup);
  });

  let logSpy: jest.Mock<(...args: unknown[]) => void>;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log') as typeof logSpy;
    logSpy.mockImplementation(noop);
  });
  afterEach(() => {
    logSpy.mockRestore();
  });

  describe('-h', () => {
    it('displays brief help', async () => {
      const call = await testPlan.parse('run-z -h', { options: shell.options() });

      await call.exec(ZShell.noop(testPlan.setup)).whenDone();

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('-h'));
    });
    it('ignores tasks without `meta.help`', async () => {
      testPlan = new TestPlan('root', {
        setup: new ZSetup({
          extensions: [
            ZHelpBuiltin,
            {
              options: {
                '--test-option': noop,
              },
            },
          ],
        }),
      });

      const call = await testPlan.parse('run-z -h', { options: shell.options() });

      await call.exec(ZShell.noop(testPlan.setup)).whenDone();

      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('--test-option'));
    });
  });

  describe('--help', () => {
    it('displays full help', async () => {
      const call = await testPlan.parse('run-z --help', { options: shell.options() });

      await call.exec(ZShell.noop(testPlan.setup)).whenDone();

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('--help'));
    });
    it('handles tasks without `meta.help`', async () => {
      testPlan = new TestPlan('root', {
        setup: new ZSetup({
          extensions: [
            ZHelpBuiltin,
            {
              options: {
                '--test-option': noop,
              },
            },
          ],
        }),
      });

      const call = await testPlan.parse('run-z --help', { options: shell.options() });

      await call.exec(ZShell.noop(testPlan.setup)).whenDone();

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('--test-option'));
    });
    it('is prohibited after executor', async () => {
      testPlan = new TestPlan('root', {
        setup: new ZSetup({
          extensions: [
            ZHelpBuiltin,
            {
              options: {
                '--test-exec'(option) {
                  option.recognize();
                  option.executeBy(execZNoOp);
                },
              },
            },
          ],
        }),
      });

      const error = await testPlan.parse('run-z --test-exec --help').catch(asis);

      expect(error).toBeInstanceOf(ZOptionError);
      expect(error.optionLocation).toEqual({
        args: ['run-z', '--test-exec', '--help'],
        index: 2,
        endIndex: 3,
        offset: 0,
        endOffset: 6,
      });
    });
  });
});

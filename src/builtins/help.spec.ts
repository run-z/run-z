import { asis, noop } from '@proc7ts/primitives';
import { execZNoOp } from '@run-z/exec-z';
import { ZOptionError } from '@run-z/optionz';
import { ZSetup, ZShell } from '../core';
import { SystemZShell } from '../os';
import { TestPlan } from '../spec';
import { ZHelpBuiltin } from './help.builtin';

describe('ZHelpBuiltin', () => {

  let testPlan: TestPlan;
  let shell: ZShell;

  beforeEach(() => {
    testPlan = new TestPlan();
    shell = new SystemZShell(testPlan.setup);
  });

  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log');
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
      testPlan = new TestPlan(
          'root',
          {
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
          },
      );

      const call = await testPlan.parse('run-z -h', { options: shell.options() });

      await call.exec(ZShell.noop(testPlan.setup)).whenDone();

      expect(logSpy).toHaveBeenCalledWith(expect.not.stringContaining('--test-option'));
    });
  });

  describe('--help', () => {
    it('displays full help', async () => {

      const call = await testPlan.parse('run-z --help', { options: shell.options() });

      await call.exec(ZShell.noop(testPlan.setup)).whenDone();

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('--help'));
    });
    it('handles tasks without `meta.help`', async () => {
      testPlan = new TestPlan(
          'root',
          {
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
          },
      );

      const call = await testPlan.parse('run-z --help', { options: shell.options() });

      await call.exec(ZShell.noop(testPlan.setup)).whenDone();

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('--test-option'));
    });
    it('is prohibited after executor', async () => {
      testPlan = new TestPlan(
          'root',
          {
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
          },
      );

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

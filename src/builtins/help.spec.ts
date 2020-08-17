import { asis, noop } from '@proc7ts/primitives';
import { ZOptionError } from '@run-z/optionz';
import { ZSetup, ZShell } from '../core';
import { execNoopZProcess } from '../internals/jobs';
import { TestPlan } from '../spec';
import { ZHelpBuiltin } from './help.builtin';

describe('ZHelpBuiltin', () => {

  let testPlan: TestPlan;

  beforeEach(() => {
    testPlan = new TestPlan();
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

      const call = await testPlan.parse('run-z -h');

      await call.exec(ZShell.noop).whenDone();

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

      const call = await testPlan.parse('run-z -h');

      await call.exec(ZShell.noop).whenDone();

      expect(logSpy).toHaveBeenCalledWith(expect.not.stringContaining('--test-option'));
    });
  });

  describe('--help', () => {
    it('displays full help', async () => {

      const call = await testPlan.parse('run-z --help');

      await call.exec(ZShell.noop).whenDone();

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

      const call = await testPlan.parse('run-z --help');

      await call.exec(ZShell.noop).whenDone();

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('--test-option'));
    });
    it('does not display help when specified after prerequisite', async () => {

      const call = await testPlan.parse('run-z test/=skip --help');

      await call.exec(ZShell.noop).whenDone();

      expect(logSpy).not.toHaveBeenCalled();
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
                      option.executeBy(execNoopZProcess);
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

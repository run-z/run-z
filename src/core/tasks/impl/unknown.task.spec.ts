import { beforeEach, describe, expect, it } from '@jest/globals';
import { asis } from '@proc7ts/primitives';
import { TestPlan } from '../../../spec';
import { ZShell } from '../../jobs';
import { UnknownZTaskError } from '../../unknown-task-error';
import { UnknownZTask } from './unknown.task';

describe('UnknownZTask', () => {
  let testPlan: TestPlan;

  beforeEach(() => {
    testPlan = new TestPlan();
  });

  it('is constructed by default', async () => {
    const call = await testPlan.call('absent');

    expect(call.task).toBeInstanceOf(UnknownZTask);
  });

  describe('exec', () => {
    it('throws when absent', async () => {
      const call = await testPlan.call('absent');
      const error = await call.exec(ZShell.noop(testPlan.setup)).whenDone().catch(asis);

      expect(error).toBeInstanceOf(UnknownZTaskError);
      expect(error.taskName).toBe('absent');
    });
    it('does not throw when called with `if-present` flag', async () => {
      testPlan.addPackage('test', {
        packageJson: {
          scripts: {
            test: 'run-z absent =if-present',
          },
        },
      });

      const call = await testPlan.call('test');

      expect(await call.exec(ZShell.noop(testPlan.setup)).whenDone()).toBeUndefined();
    });
    it('throws when `if-present` flag unset', async () => {
      testPlan.addPackage('test', {
        packageJson: {
          scripts: {
            test: 'run-z dep absent/if-present=off',
            dep: 'run-z absent/=if-present',
          },
        },
      });

      const call = await testPlan.call('test');
      const error = await call.exec(ZShell.noop(testPlan.setup)).whenDone().catch(asis);

      expect(error).toBeInstanceOf(UnknownZTaskError);
      expect(error.taskName).toBe('absent');
    });
  });
});

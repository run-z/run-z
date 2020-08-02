import { noop } from '@proc7ts/primitives';
import type { ZExecutedProcess } from '../executed-process';
import { execZProcess } from './exec-process';

describe('execZProcess', () => {
  describe('abort', () => {

    let abort: jest.Mock<any, any>;
    let proc: ZExecutedProcess;

    beforeEach(() => {
      abort = jest.fn();
    });

    afterEach(async () => {
      await proc.whenDone().catch(noop);
    });

    it('is called immediately at most once', async () => {
      proc = execZProcess(() => ({
        whenDone() {
          return Promise.resolve();
        },
        abort,
      }));

      proc.abort();
      proc.abort();
      proc.abort();

      await proc.whenDone().catch(noop);

      expect(abort).toHaveBeenCalledTimes(1);
    });
    it('is called at most once after initialization', async () => {

      let done!: () => void;
      proc = execZProcess(() => ({
        whenDone() {
          return new Promise(resolve => done = resolve);
        },
        abort,
      }));

      await Promise.resolve();
      await Promise.resolve();
      done();

      proc.abort();
      proc.abort();
      proc.abort();

      await proc.whenDone().catch(noop);

      expect(abort).toHaveBeenCalledTimes(1);
    });
  });
});

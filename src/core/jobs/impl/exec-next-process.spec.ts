import { asis } from '@proc7ts/primitives';
import type { ZExecutedProcess } from '../executed-process';
import { execNextZProcess } from './exec-next-process';
import { execZProcess } from './exec-process';

describe('execNextZProcess', () => {

  let first: ZExecutedProcess;
  let done1: () => void;
  let reject1: (error: any) => void;
  let abort1: jest.Mock;

  beforeEach(() => {
    abort1 = jest.fn();
    first = execZProcess(() => ({
      whenDone: () => new Promise((resolve, reject) => {
        done1 = resolve;
        reject1 = reject;
      }),
      abort: abort1,
    }));
  });

  let second: Promise<void>;
  let done2: () => void;
  let reject2: (error: any) => void;
  let abort2: jest.Mock;

  let proc: ZExecutedProcess;
  let success: boolean;
  let error: any;

  beforeEach(() => {
    success = false;
    error = undefined;

    done2 = undefined!;
    reject2 = undefined!;
    abort2 = jest.fn();
    second = new Promise<void>(resolveSecond => {
      proc = execNextZProcess(
          first,
          () => ({
            whenDone() {

              const result = new Promise<void>((resolve, reject) => {
                done2 = resolve;
                reject2 = reject;
              });

              resolveSecond();

              return result;
            },
            abort: abort2,
          }),
      );

      proc.whenDone().then(() => success = true, e => error = e);
    }).then(asis);
  });

  describe('whenDone', () => {
    it('succeeds when both processes succeed', async () => {
      done1();
      await second;
      expect(success).toBe(false);

      done2();
      await proc.whenDone();
      expect(success).toBe(true);
    });
    it('fails when first process failed', async () => {

      const reason = new Error('test');

      reject1(reason);

      expect(await proc.whenDone().catch(asis)).toBe(reason);
      expect(error).toBe(reason);
    });
    it('fails when second process failed', async () => {

      const reason = new Error('test');

      done1();
      await second;
      reject2(reason);

      expect(await proc.whenDone().catch(asis)).toBe(reason);
      expect(error).toBe(reason);
    });
  });

  describe('abort', () => {
    it('aborts only first processes before the second constructed', async () => {
      proc.abort();
      done1();
      await proc.whenDone();

      expect(abort1).toHaveBeenCalledTimes(1);
      expect(abort2).not.toHaveBeenCalled();
      expect(success).toBe(true);
    });
    it('aborts only second process when it is constructed', async () => {
      done1();
      await second;
      proc.abort();
      done2();
      await proc.whenDone();

      expect(abort1).not.toHaveBeenCalled();
      expect(abort2).toHaveBeenCalledTimes(1);
      expect(success).toBe(true);
    });
  });
});

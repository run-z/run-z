import { asis, noop } from '@proc7ts/primitives';
import type { ZExecution } from '../../core';
import { execZ } from './exec';
import { execZAll } from './exec-all';

describe('execZAll', () => {

  let done1: () => void;
  let reject1: (error: any) => void;
  let whenDone1: Promise<void>;
  let proc1: ZExecution;
  let isDone1: boolean;
  let abort1: jest.Mock;

  let done2: () => void;
  let whenDone2: Promise<void>;
  let proc2: ZExecution;
  let isDone2: boolean;
  let abort2: jest.Mock;

  beforeEach(() => {
    whenDone1 = new Promise<void>((resolve, reject) => {
      done1 = resolve;
      reject1 = reject;
    });
    abort1 = jest.fn();
    proc1 = execZ(() => ({
      whenDone() {
        return whenDone1;
      },
      abort: abort1,
    }));

    whenDone2 = new Promise<void>(resolve => {
      done2 = resolve;
    });
    abort2 = jest.fn();
    proc2 = execZ(() => ({
      whenDone() {
        return whenDone2;
      },
      abort: abort2,
    }));

    isDone1 = false;
    isDone2 = false;

    proc1.whenDone().then(() => isDone1 = true, noop);
    proc2.whenDone().then(() => isDone2 = true, noop);
  });

  let all: ZExecution;

  beforeEach(() => {
    all = execZAll([proc1, proc2]);
  });

  it('succeeds when all processes do', async () => {

    const promise = all.whenDone();

    done1();
    done2();
    await promise;
    expect(isDone1).toBe(true);
    expect(isDone2).toBe(true);
  });
  it('fails when one of the processes fail', async () => {

    const promise = all.whenDone();
    const error = new Error('test');

    reject1(error);
    expect(await promise.catch(asis)).toBe(error);
    expect(isDone1).toBe(false);
    expect(isDone2).toBe(false);
  });
  it('aborts other processes when one of them fail', async () => {

    const promise = all.whenDone();
    const error = new Error('test');

    reject1(error);
    expect(await promise.catch(asis)).toBe(error);
    expect(abort1).not.toHaveBeenCalled();
    expect(abort2).toHaveBeenCalledTimes(1);
  });

  describe('abort', () => {
    it('aborts all processes', async () => {

      const promise = all.whenDone();

      all.abort();
      done1();
      done2();
      await promise;

      expect(abort1).toHaveBeenCalledTimes(1);
      expect(abort2).toHaveBeenCalledTimes(1);
    });
  });
});

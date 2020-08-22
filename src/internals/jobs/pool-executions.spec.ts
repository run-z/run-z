import { asis } from '@proc7ts/primitives';
import { AbortedZExecutionError } from '../../core';
import { execZ, ZExecutionStarter } from './exec';
import { poolZExecutions } from './pool-executions';

describe('poolZExecutions', () => {

  let started: Set<number>;
  let finished: Map<number, any>;
  let aborted: Set<number>;
  let startWaiters: Map<number, () => void>;

  beforeEach(() => {
    started = new Set();
    finished = new Map();
    aborted = new Set();
    startWaiters = new Map();
  });

  it('executes immediately when `maxRunning` is zero or negative', () => {
    expect(poolZExecutions(0)).toBe(execZ);
    expect(poolZExecutions(-1)).toBe(execZ);
  });
  it('executes immediately when pool limit allows', async () => {

    const pool = poolZExecutions(2);

    const [start1, end1] = testJob(1);
    const exec1 = pool(start1);

    const [start2, end2] = testJob(2);
    const exec2 = pool(start2);

    await whenStarted(1);

    expect(started.size).toBe(2);
    expect(aborted.size).toBe(0);
    expect(finished.size).toBe(0);

    end2();
    await exec2.whenDone();

    expect(aborted.size).toBe(0);
    expect(finished.has(1)).toBe(false);
    expect(finished.get(2)).toBeNull();

    end1();
    await exec1.whenDone();

    expect(aborted.size).toBe(0);
    expect(finished.get(1)).toBeNull();
    expect(finished.get(2)).toBeNull();
  });
  it('delays execution until pool limit allows', async () => {

    const pool = poolZExecutions(1);

    const [start1, end1] = testJob(1);
    const exec1 = pool(start1);

    const [start2, end2] = testJob(2);
    const exec2 = pool(start2);

    await whenStarted(1);

    expect(started.size).toBe(1);
    expect(aborted.size).toBe(0);
    expect(finished.size).toBe(0);

    end1();
    await exec1.whenDone();
    await whenStarted(2);

    expect(started.size).toBe(2);
    expect(aborted.size).toBe(0);
    expect(finished.get(1)).toBeNull();
    expect(finished.has(2)).toBe(false);

    end2();
    await exec2.whenDone();

    expect(aborted.size).toBe(0);
    expect(finished.get(1)).toBeNull();
    expect(finished.get(2)).toBeNull();
  });
  it('returns execution slot to pool after error', async () => {

    const pool = poolZExecutions(1);

    const [start1, end1] = testJob(1);
    const exec1 = pool(start1);

    await whenStarted(1);

    expect(started.size).toBe(1);
    expect(aborted.size).toBe(0);
    expect(finished.size).toBe(0);

    const error = new Error('test');

    end1(error);
    expect(await exec1.whenDone().catch(asis)).toBe(error);
    expect(finished.get(1)).toBe(error);

    const [start2, end2] = testJob(2);
    const exec2 = pool(start2);

    await whenStarted(2);

    expect(started.size).toBe(2);
    expect(aborted.size).toBe(0);
    expect(finished.has(2)).toBe(false);

    end2();
    await exec2.whenDone();

    expect(aborted.size).toBe(0);
    expect(finished.get(1)).toBe(error);
    expect(finished.get(2)).toBeNull();
  });
  it('does not start already execution execution', async () => {

    const pool = poolZExecutions();

    const [start1, end1] = testJob(1);
    const exec1 = pool(start1);

    const [start2, end2] = testJob(2);
    const exec2 = pool(start2);

    exec1.abort();
    await whenStarted(2);

    expect(started.has(1)).toBe(false);
    expect(started.has(2)).toBe(true);
    expect(aborted.has(1)).toBe(false);
    expect(aborted.has(2)).toBe(false);

    end2();
    await exec1.whenDone();
    await exec2.whenDone();
    expect(finished.has(1)).toBe(false);
    expect(finished.get(2)).toBeNull();
  });
  it('aborts started execution', async () => {

    const pool = poolZExecutions();

    const [start1, end1] = testJob(1);
    const exec1 = pool(start1);

    const [start2, end2] = testJob(2);
    const exec2 = pool(start2);

    await whenStarted(1);
    await whenStarted(2);
    exec1.abort();

    expect(started.has(1)).toBe(true);
    expect(started.has(2)).toBe(true);
    expect(aborted.has(1)).toBe(true);
    expect(aborted.has(2)).toBe(false);

    end2();
    expect(await exec1.whenDone().catch(asis)).toBeInstanceOf(AbortedZExecutionError);
    await exec2.whenDone();
    expect(finished.get(1)).toBeInstanceOf(AbortedZExecutionError);
    expect(finished.get(2)).toBeNull();
  });

  function whenStarted(id: number): Promise<void> {
    return new Promise(resolve => {
      if (started.has(id)) {
        resolve();
      } else {
        startWaiters.set(id, resolve);
      }
    });
  }

  function testJob(id: number): [start: ZExecutionStarter, end: (error?: any) => void] {

    let end!: (error?: any) => void;
    const whenEnd = new Promise((resolve, reject) => {
      end = error => {
        if (error != null) {
          reject(error);
        } else {
          resolve();
        }
      };
    });
    const start: ZExecutionStarter = () => {
      started.add(id);
      startWaiters.get(id)?.();

      const whenDone = whenEnd.then(
          () => {
            finished.set(id, null);
          },
          error => {
            finished.set(id, error);
            return Promise.reject(error);
          },
      );

      return {
        whenDone() {
          return whenDone;
        },
        abort() {
          aborted.add(id);
          end(new AbortedZExecutionError(id));
        },
      };
    };

    return [start, end];
  }

});

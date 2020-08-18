/**
 * @packageDocumentation
 * @module run-z/internals
 */
import { mapIt } from '@proc7ts/a-iterable';
import { noop } from '@proc7ts/primitives';
import type { ZExecution } from '../../core';
import { execZ } from './exec';

/**
 * Performs execution that succeeds when all of the given executions do, or fails when either of them fail.
 *
 * Aborts other executions once one of them fail.
 *
 * @param executions  An iterable of executions.
 *
 * @returns New execution instance.
 */
export function execZAll(executions: Iterable<ZExecution>): ZExecution {
  return execZ(() => {

    const toAbort = new Set<ZExecution>(executions);
    const abort = (): void => {
      for (const proc of toAbort) {
        proc.abort();
      }
      toAbort.clear();
    };
    let fail = (proc: ZExecution): void => {
      fail = noop;
      toAbort.delete(proc);
      abort();
    };

    return {
      whenDone(): Promise<void> {
        return Promise.all(mapIt(
            toAbort,
            proc => proc.whenDone().catch(error => {
              fail(proc);
              return Promise.reject(error);
            }),
        )).then(noop);
      },
      abort,
    };
  });
}

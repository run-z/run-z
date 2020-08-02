import { mapIt } from '@proc7ts/a-iterable';
import { noop } from '@proc7ts/primitives';
import type { ZExecutedProcess } from '../executed-process';
import { execZProcess } from './exec-process';

/**
 * Builds execution process that succeeds when all of the given processes do, or fails when either of them fail.
 *
 * Aborts other executed processes once one of them fail.
 *
 * @param executed  An iterable of executed processes.
 *
 * @returns New executed process.
 */
export function execAllZProcesses(executed: Iterable<ZExecutedProcess>): ZExecutedProcess {
  return execZProcess(() => {

    const toAbort = new Set<ZExecutedProcess>();
    const abort = (): void => {
      for (const proc of toAbort) {
        proc.abort();
      }
      toAbort.clear();
    };
    let fail = (proc: ZExecutedProcess): void => {
      fail = noop;
      toAbort.delete(proc);
      abort();
    };

    return {
      whenDone(): Promise<void> {
        return Promise.all(mapIt(
            executed,
            proc => {
              toAbort.add(proc);
              return proc.whenDone().catch(error => {
                fail(proc);
                return Promise.reject(error);
              });
            },
        )).then(noop);
      },
      abort,
    };
  });
}

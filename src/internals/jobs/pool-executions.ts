import * as os from 'os';
import type { ZExecution } from '../../core';
import type { ZExecutionStarter } from './exec';
import { execZ } from './exec';
import { execZNoop } from './exec-noop';

/**
 * Constructs execution pool.
 *
 * @param maxRunning  The maximum number of simultaneously running executions. Zero or negative value means no limit.
 * Equals to the number of CPUs by default.
 *
 * @returns A function accepting execution starter and returning started or pending execution.
 */
export function poolZExecutions(
    maxRunning = os.cpus().length,
): (this: void, starter: ZExecutionStarter) => ZExecution {
  if (maxRunning <= 0) {
    return execZ;
  }

  const queue: (() => void)[] = [];
  const whenReady = (): Promise<void> => {
    if (maxRunning > 0) {
      // Reduce the number of simultaneous executions and execute immediately
      --maxRunning;
      return Promise.resolve();
    }

    // Enqueue execution
    return new Promise(resolve => {
      queue.push(resolve);
    });
  };
  const execEnd = (): void => {

    const next = queue.shift();

    if (next) {
      // Execute next queued
      // The number of running jobs is not changed
      next();
    } else {
      // No more executions in queue
      // Allow one more simultaneous execution
      ++maxRunning;
    }
  };

  return starter => {

    let start = starter;
    let abort = (): void => {
      start = execZNoop;
    };
    const whenDone = whenReady().then(async () => {

      const execution = execZ(start);

      abort = () => execution.abort();

      return execution.whenDone();
    }).finally(execEnd);

    return {
      whenDone() {
        return whenDone;
      },
      abort() {
        abort();
      },
    };
  };
}

/**
 * @packageDocumentation
 * @module run-z/internals
 */
import { noop, valueProvider } from '@proc7ts/primitives';
import type { ZExecution } from '../../core';
import { execZ, ZExecutionStarter } from './exec';

/**
 * @internal
 */
export function execZNext(
    first: ZExecution,
    next: ZExecutionStarter,
): ZExecution {

  const whenFirstDone = first.whenDone();

  return execZ(() => {

    let abort: () => void;
    let startNext = async (): Promise<void> => {

      const proc = execZ(next);

      abort = () => {
        abort = noop;
        proc.abort();
      };

      return proc.whenDone();
    };

    abort = (): void => {
      abort = noop;
      startNext = valueProvider(whenFirstDone);
      first.abort();
    };

    return {
      whenDone() {
        return whenFirstDone.then(() => startNext());
      },
      abort() {
        abort();
      },
    };
  });
}

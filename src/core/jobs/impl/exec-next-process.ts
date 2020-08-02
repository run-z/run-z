import { noop, valueProvider } from '@proc7ts/primitives';
import type { ZExecutedProcess } from '../executed-process';
import { execZProcess } from './exec-process';

/**
 * @internal
 */
export function execNextZProcess(
    first: ZExecutedProcess,
    next: (this: void) => ZExecutedProcess,
): ZExecutedProcess {
  return execZProcess(() => {

    const whenFirstDone = first.whenDone();
    let abort: () => void;
    let startNext = async (): Promise<void> => {

      const proc = execZProcess(next());

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

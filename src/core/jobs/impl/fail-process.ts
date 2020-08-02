import { noop } from '@proc7ts/primitives';
import type { ZExecutedProcess } from '../executed-process';

export function failZProcess(reason: any): ZExecutedProcess {

  const rejection = Promise.reject(reason);

  return {
    abort: noop,
    whenDone() {
      return rejection;
    },
  };
}

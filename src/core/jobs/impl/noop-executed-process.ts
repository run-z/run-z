import { noop } from '@proc7ts/primitives';
import type { ZExecutedProcess } from '../executed-process';

/**
 * @internal
 */
const zExecutedProcessDone = Promise.resolve();

/**
 * @internal
 */
export const noopZExecutedProcess: ZExecutedProcess = {
  abort: noop,
  whenDone(): Promise<void> {
    return zExecutedProcessDone;
  },
};

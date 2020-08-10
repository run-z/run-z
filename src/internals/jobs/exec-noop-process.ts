/**
 * @packageDocumentation
 * @module run-z/internals
 */
import { noop } from '@proc7ts/primitives';
import type { ZExecutedProcess } from '../../core';

/**
 * @internal
 */
const zExecutedProcessDone = Promise.resolve();

/**
 * @internal
 */
const noopZExecutedProcess: ZExecutedProcess = {
  abort: noop,
  whenDone(): Promise<void> {
    return zExecutedProcessDone;
  },
};

/**
 * Builds no-op execution process.
 *
 * @returns Already completed process.
 */
export function execNoopZProcess(): ZExecutedProcess {
  return noopZExecutedProcess;
}

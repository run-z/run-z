/**
 * @packageDocumentation
 * @module run-z/internals
 */
import { noop } from '@proc7ts/primitives';
import type { ZExecution } from '../../core';

/**
 * Performs failed execution.
 *
 * @param reason  A reason of execution failure.
 *
 * @returns Failed execution instance.
 */
export function failZ(reason: any): ZExecution {

  const rejection = Promise.reject(reason);

  return {
    abort: noop,
    whenDone() {
      return rejection;
    },
  };
}

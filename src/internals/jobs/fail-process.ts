/**
 * @packageDocumentation
 * @module run-z/internals
 */
import { noop } from '@proc7ts/primitives';
import type { ZExecutedProcess } from '../../core';

/**
 * Builds failed executed process.
 *
 * @param reason  A reason of execution failure.
 *
 * @returns Failed process.
 */
export function failZProcess(reason: any): ZExecutedProcess {

  const rejection = Promise.reject(reason);

  return {
    abort: noop,
    whenDone() {
      return rejection;
    },
  };
}

/**
 * @packageDocumentation
 * @module run-z/internals
 */
import { asyncByRecipe, noop } from '@proc7ts/primitives';
import type { ZExecutedProcess } from '../../core';

/**
 * Executed process starter signature.
 *
 * Constructs new process initializers.
 */
export type ZExecutedProcessStarter =
/**
 * @returns  Either executed process initializer, or a promise-like instance resolving to one.
 */
    (this: void) => ZExecutedProcess | PromiseLike<ZExecutedProcess>;

/**
 * Builds execution process by its starter.
 *
 * @param starter  Execution process starter function.
 *
 * @returns Executed process.
 */
export function execZProcess(starter: ZExecutedProcessStarter): ZExecutedProcess {

  let initialize: (init: ZExecutedProcess) => void;
  let abort = (): void => {
    abort = noop;
    initialize = init => {
      init.abort();
    };
  };

  initialize = init => {
    initialize = noop;
    abort = () => {
      abort = noop;
      init.abort();
    };
  };

  const done = (): void => {
    abort = noop;
  };

  const whenDone: Promise<void> = asyncByRecipe(starter).then(init => {
    initialize(init);
    return init.whenDone().finally(done);
  });

  return {
    whenDone() {
      return whenDone;
    },
    abort() {
      abort();
    },
  };
}

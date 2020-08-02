import { asyncRecipe, noop } from '@proc7ts/primitives';
import type { ZExecutedProcess } from '../executed-process';

/**
 * A seed of executed process.
 *
 * This can be one of:
 *
 * - executed process initializer,
 * - a promise-like instance resolving to the one, or
 * - or a starter function returning one of the above.
 *
 * @internal
 */
export type ZExecutedProcessSeed =
    | ZExecutedProcess
    | PromiseLike<ZExecutedProcess>
    | ZExecutedProcessStarter;

/**
 * Executed process starter signature.
 *
 * Constructs new process initializers.
 *
 * @internal
 */
export type ZExecutedProcessStarter =
/**
 * @returns  Either executed process initializer, or a promise-like instance resolving to one.
 */
    (this: void) => ZExecutedProcess | PromiseLike<ZExecutedProcess>;

/**
 * @internal
 */
export function execZProcess(seed: ZExecutedProcessSeed): ZExecutedProcess {

  const start = asyncRecipe(seed);
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

  const whenDone: Promise<void> = start().then(init => {
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

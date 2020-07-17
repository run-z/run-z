/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZCall } from '../plan';
import type { ZSetup } from '../setup';
import type { ZTaskSpec } from '../tasks';
import type { ZRun } from './run';

/**
 * Task runner.
 */
export class ZRunner {

  constructor(readonly setup: ZSetup) {
  }

  run<TAction extends ZTaskSpec.Action>(_call: ZCall<TAction>): ZRun<TAction> {
    throw new Error('Unsupported');
  }

}

/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZCall } from '../plan';
import type { ZTaskSpec } from '../tasks';

export interface ZRun<TAction extends ZTaskSpec.Action = ZTaskSpec.Action> {

  readonly call: ZCall<TAction>;

  whenComplete(): Promise<void>;

}

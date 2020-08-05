/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZCallDetails } from '../plan';
import type { ZTaskSpec } from '../tasks';
import type { ZBatcher } from './batcher';

/**
 * Details of the {@link ZBatchPlanner.batch task batching}.
 *
 * @typeparam TAction  Task action type.
 */
export interface ZBatchDetails<TAction extends ZTaskSpec.Action = ZTaskSpec.Action> extends ZCallDetails<TAction> {

  /**
   * The batcher to batch transient calls with.
   *
   * @default Current batcher.
   */
  readonly batcher?: ZBatcher;

}

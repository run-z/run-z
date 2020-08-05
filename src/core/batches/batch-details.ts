/**
 * @packageDocumentation
 * @module run-z
 */
import { ZCallDetails } from '../plan';
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

/**
 * Full details of the {@link ZBatchPlanner.batch task batching}.
 *
 * @typeparam TAction  Task action type.
 */
export namespace ZBatchDetails {

  export interface Full<TAction extends ZTaskSpec.Action = ZTaskSpec.Action> extends ZCallDetails.Full<TAction> {

    /**
     * The batcher to batch transient calls with.
     *
     * @default Current batcher.
     */
    readonly batcher?: ZBatcher;

  }

}

export const ZBatchDetails = {

  /**
   * Reconstructs full details of the task batching by partial ones.
   *
   * @typeparam TAction  Task action type.
   * @param details  Partial task call details.
   *
   * @returns Full task batching details.
   */
  by<TAction extends ZTaskSpec.Action>(
      details?: ZBatchDetails<TAction>,
  ): ZBatchDetails.Full<TAction> {
    return details?.batcher
        ? {
          ...ZCallDetails.by(details),
          batcher: details.batcher,
        }
        : ZCallDetails.by(details);
  },

};

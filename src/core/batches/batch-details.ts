import { ZCallDetails } from '../plan';
import type { ZTaskSpec } from '../tasks';
import { ZBatching } from './batching';

/**
 * Details of the {@link ZBatchPlanner.batch task batching}.
 *
 * @typeparam TAction  Task action type.
 */
export interface ZBatchDetails<TAction extends ZTaskSpec.Action = ZTaskSpec.Action>
  extends ZCallDetails<TAction> {
  /**
   * A policy to apply when batching transient calls.
   *
   * @default Current batching policy.
   */
  readonly batching?: ZBatching | undefined;
}

/**
 * Full details of the {@link ZBatchPlanner.batch task batching}.
 *
 * @typeparam TAction  Task action type.
 */
export namespace ZBatchDetails {
  export interface Full<TAction extends ZTaskSpec.Action = ZTaskSpec.Action>
    extends ZCallDetails.Full<TAction> {
    /**
     * A policy to apply when batching transient calls.
     */
    readonly batching: ZBatching;
  }
}

export const ZBatchDetails = {
  /**
   * Reconstructs full details of the task batching by partial ones.
   *
   * @typeparam TAction  Task action type.
   * @param details - Partial task call details.
   *
   * @returns Full task batching details.
   */
  by<TAction extends ZTaskSpec.Action>(
    details: ZBatchDetails<TAction> = {},
  ): ZBatchDetails.Full<TAction> {
    const { batching = ZBatching.unprocessedBatching() } = details;

    return {
      ...ZCallDetails.by(details),
      batching,
    };
  },
};

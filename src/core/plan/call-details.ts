import type { ZTaskSpec } from '../tasks';
import type { ZCallPlanner } from './call-planner';
import { ZTaskParams } from './task-params';

/**
 * Details of the {@link ZCallPlanner.call task call}.
 *
 * @typeparam TAction  Task action type.
 */
export interface ZCallDetails<TAction extends ZTaskSpec.Action = ZTaskSpec.Action> {
  /**
   * Evaluates parameters of the call.
   *
   * @param evaluator - Task parameters evaluation context.
   *
   * @returns Partial task parameters.
   */
  params?(evaluator: ZTaskParams.Evaluator): ZTaskParams.Partial;

  /**
   * Plans the call execution.
   *
   * Records further task execution instructions.
   *
   * @param planner - Task execution planner to record instructions to.
   *
   * @returns Either nothing when instructions recorded synchronously, or a promise-like instance resolved when
   * instructions recorded asynchronously.
   */
  plan?(planner: ZCallPlanner<TAction>): void | PromiseLike<unknown>;
}

export namespace ZCallDetails {
  /**
   * Full details of the {@link ZCallPlanner.call task call}.
   *
   * @typeparam TAction  Task action type.
   */
  export interface Full<TAction extends ZTaskSpec.Action = ZTaskSpec.Action> {
    /**
     * Evaluates parameters of the call.
     *
     * @param evaluator - Task parameters evaluation context.
     *
     * @returns Evaluated task parameters.
     */
    params(this: void, evaluator: ZTaskParams.Evaluator): ZTaskParams;

    /**
     * Plans the call execution.
     *
     * Records further task execution instructions.
     *
     * @param planner - Task execution planner to record instructions to.
     *
     * @returns A promise resolved when instructions recorded.
     */
    plan(this: void, planner: ZCallPlanner<TAction>): Promise<void>;
  }
}

export const ZCallDetails = {
  /**
   * Reconstructs full details of the task call by partial ones.
   *
   * @typeparam TAction  Task action type.
   * @param details - Partial task call details.
   *
   * @returns Full task call details.
   */
  by<TAction extends ZTaskSpec.Action>(
    details: ZCallDetails<TAction> = {},
  ): ZCallDetails.Full<TAction> {
    return {
      params: evaluator => new ZTaskParams(ZTaskParams.update(ZTaskParams.newMutable(), details.params?.(evaluator))),
      plan: async planner => {
        await details.plan?.(planner);
      },
    };
  },
};

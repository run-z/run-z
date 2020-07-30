/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZTaskSpec } from '../tasks';
import type { ZCallPlanner } from './call-planner';
import type { ZTaskParams } from './task-params';

/**
 * Details of the {@link ZCallPlanner.call task call}.
 *
 * @typeparam TAction  Task action type.
 */
export interface ZCallDetails<TAction extends ZTaskSpec.Action = ZTaskSpec.Action> {

  /**
   * Evaluates parameters of the call.
   */
  params?(): ZTaskParams.Partial;

  /**
   * Plans the call execution.
   *
   * Records further task execution instructions.
   *
   * @param planner  Task execution planner to record instructions to.
   *
   * @returns Either nothing when instructions recorded synchronously, or a promise-like instance resolved when
   * instructions recorded asynchronously.
   */
  plan?(planner: ZCallPlanner<TAction>): void | PromiseLike<unknown>;

}

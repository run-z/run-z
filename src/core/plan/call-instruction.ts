/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZTask, ZTaskSpec } from '../tasks';
import type { ZCallPlanner } from './call-planner';
import type { ZTaskParams } from './task-params';

/**
 * An instruction for calling the task.
 *
 * Such instructions {@link ZCallPlanner.call recorded to execution plans}.
 *
 * @typeparam TAction  Task action type.
 */
export interface ZCallInstruction<TAction extends ZTaskSpec.Action = ZTaskSpec.Action> {

  /**
   * The task to call.
   */
  readonly task: ZTask<TAction>;

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

/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZTask, ZTaskSpec } from '../tasks';
import type { ZCall } from './call';

/**
 * Task execution plan.
 */
export interface ZPlan {

  /**
   * Task execution calls of this plan.
   *
   * @returns An iterable of task execution calls.
   */
  calls(): Iterable<ZCall>;

  /**
   * Returns a call of the given task.
   *
   * @typeparam TAction  Task action type.
   * @param task  Target task.
   *
   * @returns Either a call to the given task.
   *
   * @throws TypeError  If the given task call is not planned.
   */
  callOf<TAction extends ZTaskSpec.Action>(task: ZTask<TAction>): ZCall<TAction>;

}

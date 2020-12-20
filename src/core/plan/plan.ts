/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZPackage } from '../packages';
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
   * @param task - Target task.
   *
   * @returns A call to the given task.
   *
   * @throws TypeError  If the given task call is not planned.
   */
  callOf<TAction extends ZTaskSpec.Action>(task: ZTask<TAction>): ZCall<TAction>;

  /**
   * Searches for a call for the task with the given name.
   *
   * @param target - Target package.
   * @param taskName - Task name.
   *
   * @returns Either a call to the target task, or `undefined` if the call did not happen.
   */
  findCallOf(target: ZPackage, taskName: string): ZCall | undefined;

}

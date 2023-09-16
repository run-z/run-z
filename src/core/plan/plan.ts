import { ZPackage } from '../packages/package.js';
import { ZTaskSpec } from '../tasks/task-spec.js';
import { ZTask } from '../tasks/task.js';
import { ZCall } from './call.js';

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
   * @typeParam TAction  Task action type.
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

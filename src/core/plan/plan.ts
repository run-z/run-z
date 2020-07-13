/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZTask } from '../tasks';
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
   * @param task  Target task.
   *
   * @returns Either a call to the given task, or `undefined` if the task is never called by this plan.
   */
  callOf(task: ZTask): ZCall | undefined;

}

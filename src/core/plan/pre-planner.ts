/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZTask, ZTaskSpec } from '../tasks';
import type { ZCall } from './call';
import type { ZCallDetails } from './call-details';
import type { ZCallPlanner } from './call-planner';

/**
 * A planner of prerequisite call.
 *
 * Passed to {@link ZTask.callAsPre} to record prerequisite calls.
 */
export interface ZPrePlanner {

  /**
   * A planner of the call to the task depending on this prerequisite.
   */
  readonly dependent: ZCallPlanner;

  /**
   * Records a call to prerequisite task.
   *
   * Updates already recorded call to the same task.
   *
   * @typeparam TAction  Task action type.
   * @param task  The task to call.
   * @param details  The details of the call.
   *
   * @returns A promise resolved to the task call when it is recorded.
   */
  preCall<TAction extends ZTaskSpec.Action>(task: ZTask<TAction>, details?: ZCallDetails<TAction>): Promise<ZCall>;

}

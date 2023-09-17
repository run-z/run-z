import { ZBatching } from '../batches/batching.js';
import { ZPackageSet } from '../packages/package-set.js';
import { ZTaskSpec } from '../tasks/task-spec.js';
import { ZTask } from '../tasks/task.js';
import { ZCallDetails } from './call-details.js';
import { ZCallPlanner } from './call-planner.js';
import { ZCall } from './call.js';

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
   * Batching policy to apply when batch transient prerequisites.
   */
  readonly batching: ZBatching;

  /**
   * Applies prerequisite targets.
   *
   * This is called by group tasks to reuse their package selectors.
   *
   * @param targets - A set of packages selected by prerequisite.
   */
  applyTargets(this: void, targets: ZPackageSet): void;

  /**
   * Records a call to prerequisite task.
   *
   * Updates already recorded call to the same task.
   *
   * @typeParam TAction  Task action type.
   * @param task - The task to call.
   * @param details - The details of the call.
   *
   * @returns A promise resolved to the task call when it is recorded.
   */
  callPre<TAction extends ZTaskSpec.Action>(
    this: void,
    task: ZTask<TAction>,
    details?: ZCallDetails<TAction>,
  ): Promise<ZCall>;

  /**
   * Builds a transient prerequisites planner based on this one with updated batching policy for prerequisites.
   *
   * @param batching - Transient prerequisites batching policy.
   *
   * @returns New prerequisites planner.
   */
  transient(batching: ZBatching): ZPrePlanner;
}

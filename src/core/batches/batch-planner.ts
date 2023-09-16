import { ZPackageSet } from '../packages/package-set.js';
import { ZCallPlanner } from '../plan/call-planner.js';
import { ZCall } from '../plan/call.js';
import { ZTaskSpec } from '../tasks/task-spec.js';
import { ZTask } from '../tasks/task.js';
import { ZBatchDetails } from './batch-details.js';

/**
 * Batch execution planner.
 *
 * Passed to {@link ZBatcher batcher} in order the latter to record batched task calls.
 */
export interface ZBatchPlanner {
  /**
   * A planner of the call to the task depending on the batched ones.
   */
  readonly dependent: ZCallPlanner;

  /**
   * Target packages to batch the named tasks of.
   */
  readonly targets: ZPackageSet;

  /**
   * Batched tasks name.
   */
  readonly taskName: string;

  /**
   * Whether task annexes are batched.
   */
  readonly isAnnex: boolean;

  /**
   * Records task to call in batch.
   *
   * @typeParam TAction  Batched task action type.
   * @param task - The task to batch.
   * @param details - Call details for each of the batched tasks.
   *
   * @returns A promise resolved when task call recorded.
   */
  batch<TAction extends ZTaskSpec.Action>(
    this: void,
    task: ZTask<TAction>,
    details?: ZBatchDetails<TAction>,
  ): Promise<ZCall>;
}

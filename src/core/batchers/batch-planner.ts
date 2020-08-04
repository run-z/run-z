/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZPackage } from '../packages';
import type { ZCallDetails, ZCallPlanner } from '../plan';
import type { ZTask } from '../tasks';

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
   * Target package to apply batched tasks to.
   */
  readonly target: ZPackage;

  /**
   * Batched tasks name.
   */
  readonly taskName: string;

  /**
   * Records task to call in batch.
   *
   * @param task  The task to batch.
   * @param details  Call details for each of the batched tasks.
   *
   * @returns A promise resolved when task call recorded.
   */
  batch(task: ZTask, details?: ZCallDetails): Promise<void>;

}

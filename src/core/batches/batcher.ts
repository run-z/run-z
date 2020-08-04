/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZBatchPlanner } from './batch-planner';

/**
 * A batcher of tasks to execute.
 *
 * Records tasks to be executed in batch.
 */
export type ZBatcher =
/**
 * @param planner  Batch execution planner to record calls to.
 *
 * @returns Either nothing if batch execution planned synchronously, or a promise-like instance resolved when batch
 * execution planned asynchronously.
 */
    (
        this: void,
        planner: ZBatchPlanner,
    ) => void | PromiseLike<unknown>;

export const ZBatcher = {

  /**
   * Batches a named task in target package.
   *
   * This is the default {@link ZBatcher task batcher}.
   *
   * @param planner  Batch execution planner to record a task call to.
   *
   * @returns A promise resolved when task call recorded.
   */
  async batchTask(this: void, planner: ZBatchPlanner): Promise<void> {

    const task = await planner.target.task(planner.taskName);

    return planner.batch(task);
  },

};

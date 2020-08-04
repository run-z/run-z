/**
 * @packageDocumentation
 * @module run-z
 */
import { mapIt } from '@proc7ts/a-iterable';
import type { ZPackage } from '../packages';
import type { ZBatchPlanner } from './batch-planner';

/**
 * A batcher of tasks to execute.
 *
 * Records tasks to be executed in batch.
 */
export type ZBatcher =
/**
 * @param planner  Batch execution planner to record task calls to.
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

  /**
   * Batches the named task in each package from each named set defined in target package.
   *
   * A named package set is a (preferably {@link ZTaskSpec.Group grouping}) task with name like `group-name/*`
   * or `group-name/task-name`. The latter is called when `task-name` matches the {@link ZBatchPlanner.taskName batched
   * one}. The former is called when there is no matching set in the latter form found.
   *
   * @param planner  Batch execution planner to record task calls to.
   *
   * @returns A promise resolved when batch execution planned.
   */
  async batchSets(this: void, planner: ZBatchPlanner): Promise<void> {

    const { target } = planner;

    await Promise.all(mapIt(
        zPackageSetNames(planner),
        packageSetName => target.task(packageSetName).then(taskName => planner.batch(taskName)),
    ));
  },

  /**
   * Creates a task batcher for topmost package.
   *
   * Batches tasks in the topmost package the given `batcher` is able to batch anything.
   *
   * @param batcher  A task batcher the created batcher delegates batching to. By default batches the named task in
   * {@link ZBatcher.batchSets each package from each named set} defined in that package.
   *
   * @returns New task batcher.
   */
  topmost(this: void, batcher?: ZBatcher): ZBatcher {
    return planner => batchInZTarget(
        batcher || ZBatcher.batchSets, // Can't use default parameter value. `ZBatcher` becomes `any` otherwise.
        planner,
        planner.target,
    );
  },

};

/**
 * @internal
 */
function zPackageSetNames({ target, taskName }: ZBatchPlanner): Iterable<string> {

  const { scripts = {} } = target.packageJson;
  const groups = new Map<string, string>();

  for (const script of Object.keys(scripts)) {

    const slashIdx = script.lastIndexOf('/');

    if (slashIdx > 0) {

      const groupName = script.substr(0, slashIdx);
      const groupTask = script.substr(slashIdx + 1);

      if (groupTask === taskName || (groupTask === '*' && !groups.has(groupName))) {
        groups.set(groupName, script);
      }
    }
  }

  return groups.values();
}

/**
 * @internal
 */
async function batchInZTarget(batcher: ZBatcher, planner: ZBatchPlanner, target: ZPackage): Promise<boolean> {

  const { parent } = target;

  if (parent) {
    if (await batchInZTarget(batcher, planner, parent)) {
      return true;
    }
  }

  let batched = false;

  await batcher({
    dependent: planner.dependent,
    target,
    taskName: planner.taskName,
    batch(task, details) {
      batched = true;
      return planner.batch(task, details);
    },
  });

  return batched;
}

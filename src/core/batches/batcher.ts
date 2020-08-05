/**
 * @packageDocumentation
 * @module run-z
 */
import { itsEmpty, makeIt, mapIt } from '@proc7ts/a-iterable';
import type { ZPackage } from '../packages';
import type { ZTask, ZTaskSpec } from '../tasks';
import { ZBatchDetails } from './batch-details';
import type { ZBatchPlanner } from './batch-planner';

/**
 * A batcher of tasks to execute.
 *
 * Records tasks to be executed in batch.
 */
export type ZBatcher =
/**
 * @param planner  Batch execution planner to record batched task calls to.
 *
 * @returns Either nothing if batch execution planned synchronously, or a promise-like instance resolved when batch
 * execution planned asynchronously.
 */
    (
        this: void,
        planner: ZBatchPlanner,
    ) => void | PromiseLike<unknown>;

export namespace ZBatcher {

  /**
   * Task batcher provider signature.
   *
   * Tries to create a batcher for the given batch execution planner.
   */
  export type Provider =
  /**
   * @param planner  Target batch execution planner.
   *
   * @returns Either nothing if batch planning is impossible, a batcher instance to plan batch execution by, or
   * a promise resolving to one of the above.
   */
      (
          this: void,
          planner: ZBatchPlanner,
      ) => undefined | ZBatcher | Promise<undefined | ZBatcher>;
}

export const ZBatcher = {

  /**
   * Batches the named task in target package.
   *
   * This is the default {@link ZBatcher task batcher}.
   *
   * @param planner  Batch execution planner to record batched task call to.
   *
   * @returns A promise resolved when task call recorded.
   */
  async batchTask(this: void, planner: ZBatchPlanner): Promise<void> {

    const task = await planner.target.task(planner.taskName);

    return planner.batch(task);
  },

  /**
   * Batches tasks in all named batches.
   *
   * A named batch is defined by (preferably {@link ZTaskSpec.Group grouping}) task with the name like one of:
   *
   * - `batch-name/task-name`.
   *   Such batch is processed when the {@link ZBatchPlanner.taskName batched task name} matches `task-name`.
   *
   * - `batch-name/*`.
   *   Such batch is processed, unless there is another named batch `batch-name/task-name` defined with the
   *   {@link ZBatchPlanner.taskName batched task name} matching `task-name`.
   *
   * If target package has no matching named batches then batches the task by {@link ZBatcher.batchTask default
   * batcher}.
   *
   * @param planner  Batch execution planner to record batched task calls to.
   *
   * @returns A promise resolved when batch execution planned.
   */
  async batchNamed(this: void, planner: ZBatchPlanner): Promise<void> {

    const { target } = planner;
    const batchNames = zBatchNames(planner);

    if (itsEmpty(batchNames)) {
      // No matching sets.
      // Fallback to default task batching.
      await ZBatcher.batchTask(planner);
    } else {
      await Promise.all(mapIt(
          batchNames,
          batchName => target.task(batchName).then(taskName => planner.batch(taskName)),
      ));
    }
  },

  /**
   * Creates a task batcher for topmost package.
   *
   * Batches tasks in the topmost package a batcher can be created for.
   *
   * @param provider  A provider of task batcher to plan batch execution with. By default creates a batcher that batches
   * the named task over {@link ZBatcher.batchNamed each package in each named set}, and ignores targets
   * without matching named package sets.
   *
   * @returns New task batcher.
   */
  topmost(
      this: void,
      provider: ZBatcher.Provider = defaultZBatcherProvider,
  ): ZBatcher {
    return async planner => {
      if (await batchInZTarget(provider, planner, planner.target)) {
        // Batched in parent
        return;
      }

      // Fallback to default batcher.
      const batcher = ZBatcher.batchTask;

      return batcher({
        ...planner,
        batch<TAction extends ZTaskSpec.Action>(
            task: ZTask<TAction>,
            details: ZBatchDetails<TAction> = {},
        ): Promise<void> {
          return planner.batch(task, { batcher, ...ZBatchDetails.by(details) });
        },
      });
    };
  },

};

/**
 * @internal
 */
function defaultZBatcherProvider(planner: ZBatchPlanner): ZBatcher | undefined {
  return itsEmpty(zBatchNames(planner)) ? undefined : ZBatcher.batchNamed;
}

/**
 * @internal
 */
function zBatchNames({ target, taskName }: ZBatchPlanner): Iterable<string> {

  const groups = new Map<string, string>();

  for (const script of target.taskNames()) {

    const slashIdx = script.lastIndexOf('/');

    if (slashIdx > 0) {

      const groupName = script.substr(0, slashIdx);
      const groupTask = script.substr(slashIdx + 1);

      if (groupTask === taskName || (groupTask === '*' && !groups.has(groupName))) {
        groups.set(groupName, script);
      }
    }
  }

  return makeIt(() => groups.values());
}

/**
 * @internal
 */
async function batchInZTarget(
    provider: ZBatcher.Provider,
    planner: ZBatchPlanner,
    target: ZPackage,
): Promise<boolean> {

  const { parent } = target;

  // Try parent package first.
  if (parent && await batchInZTarget(provider, planner, parent)) {
    // Batched in parent.
    return true;
  }

  // eslint-disable-next-line prefer-const
  let batcher: ZBatcher | undefined;

  // Parent package can not be batched.
  // Try here.
  const targetPlanner: ZBatchPlanner = {
    dependent: planner.dependent,
    target,
    taskName: planner.taskName,
    batch(task, details = {}) {
      return planner.batch(task, { batcher, ...ZBatchDetails.by(details) });
    },
  };

  batcher = await provider(targetPlanner);

  if (!batcher) {
    return false;
  }

  await batcher(targetPlanner);

  return true;
}

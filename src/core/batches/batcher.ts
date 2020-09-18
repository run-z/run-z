/**
 * @packageDocumentation
 * @module run-z
 */
import { itsEmpty } from '@proc7ts/a-iterable';
import type { ZPackage } from '../packages';
import type { ZCall } from '../plan';
import type { ZTask, ZTaskSpec } from '../tasks';
import { ZBatchDetails } from './batch-details';
import type { ZBatchPlanner } from './batch-planner';
import { batchZTask } from './batcher.impl';
import { ZBatching } from './batching';
import { NamedZBatcher } from './named.batcher.impl';

/**
 * A batcher of tasks to execute.
 *
 * Records tasks to be executed in batch.
 */
export type ZBatcher =
/**
 * @param planner  Batch execution planner to record batched task calls to.
 * @param batching  Task batching policy.
 *
 * @returns Either nothing if batch execution planned synchronously, or a promise-like instance resolved when batch
 * execution planned asynchronously.
 */
    (
        this: void,
        planner: ZBatchPlanner,
        batching: ZBatching,
    ) => void | PromiseLike<unknown>;

export namespace ZBatcher {

  /**
   * Task batcher provider signature.
   *
   * Tries to create a batcher for the given batch execution planner in the given package.
   */
  export type Provider =
  /**
   * @param target  Target package.
   * @param planner  Target batch execution planner.
   * @param batching  Task batching policy.
   *
   * @returns Either nothing if batch planning is impossible, a batcher instance to plan batch execution by, or
   * a promise resolving to one of the above.
   */
      (
          this: void,
          target: ZPackage,
          planner: ZBatchPlanner,
          batching: ZBatching,
      ) => undefined | ZBatcher | Promise<undefined | ZBatcher>;

  /**
   * Defines named batches to follow when discover packages to build.
   */
  export interface NamedBatches {

    /**
     * Named batches to limit the packages discovery by.
     *
     * At least one of these batches should be defined in top level package, otherwise the build will be empty.
     *
     * All named batches except additional ones are used when absent.
     *
     * Corresponds to `--only` command line option.
     */
    readonly only?: Iterable<string>;

    /**
     * Additional named batches to use for package discovery.
     *
     * This can be used to include additional batches into the build, excluded otherwise.
     *
     * Corresponds to `--with` command line option.
     */
    readonly with?: Iterable<string>;

    /**
     * Named batches to exclude from the build.
     *
     * Corresponds to `--except` command line option.
     */
    readonly except?: Iterable<string>;

  }

}

export const ZBatcher = {

  /**
   * Batches the named tasks in target packages.
   *
   * This is the default {@link ZBatcher task batcher}.
   *
   * @param planner  Batch execution planner to record batched task call to.
   *
   * @returns A promise resolved when task call recorded.
   */
  batchTask(this: void, planner: ZBatchPlanner): Promise<void> {
    return batchZTask(planner);
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
    return NamedZBatcher.default.batch(planner);
  },

  /**
   * Creates a task batcher provider that batches tasks in the given named batches.
   *
   * @param namedBatches  Named batches to follow when discover packages to build.
   *
   * @returns New batcher provider.
   */
  named(this: void, namedBatches?: ZBatcher.NamedBatches): ZBatcher.Provider {

    const batcher = NamedZBatcher.newInstance(namedBatches);

    return (target: ZPackage, planner: ZBatchPlanner) => itsEmpty(batcher.names(target, planner.taskName, true))
        ? undefined
        : batcher.batch.bind(batcher);
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
    return async (planner, batching) => {
      if (await batchInZTarget(provider, planner, batching, planner.dependent.plannedCall.task.target)) {
        // Try to batch in topmost target.
        return;
      }

      // Fallback to default batcher.
      const batcher = ZBatcher.batchTask;

      return batcher({
        ...planner,
        batch<TAction extends ZTaskSpec.Action>(
            task: ZTask<TAction>,
            details: ZBatchDetails<TAction>,
        ): Promise<ZCall> {

          const batchDetails = ZBatchDetails.by(details);

          return planner.batch(
              task,
              {
                ...batchDetails,
                batching: ZBatching.unprocessedBatching(batcher).mergeWith(batchDetails.batching),
              },
          );
        },
      });
    };
  },

};


/**
 * @internal
 */
function defaultZBatcherProvider(target: ZPackage, planner: ZBatchPlanner): ZBatcher | undefined {
  return itsEmpty(NamedZBatcher.default.names(target, planner.taskName)) ? undefined : ZBatcher.batchNamed;
}

/**
 * @internal
 */
async function batchInZTarget(
    provider: ZBatcher.Provider,
    planner: ZBatchPlanner,
    batching: ZBatching,
    target: ZPackage,
): Promise<boolean> {

  const { parent } = target;

  // Try parent package first.
  if (parent && await batchInZTarget(provider, planner, batching, parent)) {
    // Batched in parent.
    return true;
  }

  // eslint-disable-next-line prefer-const
  let batcher: ZBatcher | undefined;

  // Parent package can not be batched.
  // Try here.
  const targetPlanner: ZBatchPlanner = {
    dependent: planner.dependent,
    targets: target,
    taskName: planner.taskName,
    isAnnex: planner.isAnnex,
    batch(task, details) {

      const batchDetails = ZBatchDetails.by(details);

      return planner.batch(
          task,
          {
            ...batchDetails,
            batching: ZBatching.unprocessedBatching(batcher).mergeWith(batchDetails.batching),
          },
      );
    },
  };

  batcher = await provider(target, targetPlanner, batching);

  if (!batcher) {
    return false;
  }

  await batcher(targetPlanner, batching);

  return true;
}

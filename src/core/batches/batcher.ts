/**
 * @packageDocumentation
 * @module run-z
 */
import { itsEmpty, makeIt, mapIt } from '@proc7ts/a-iterable';
import type { ZPackage } from '../packages';
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
   * Batches the named task over each package in each named set from target package.
   *
   * A named package set is a (preferably {@link ZTaskSpec.Group grouping}) task with the name like `group-name/*`
   * or `group-name/task-name`. The latter is called when `task-name` matches the {@link ZBatchPlanner.taskName batched
   * one}. The former is called when there is no matching set in the latter form found.
   *
   * If target package has no named package sets, then batches a task with the given name if the target package has one.
   *
   * @param planner  Batch execution planner to record batched task calls to.
   *
   * @returns A promise resolved when batch execution planned.
   */
  async batchOverPackageSets(this: void, planner: ZBatchPlanner): Promise<void> {

    const { target } = planner;
    const packageSetNames = zPackageSetNames(planner);

    if (itsEmpty(packageSetNames)) {
      // No matching sets.
      // Fallback to default task batching.
      await ZBatcher.batchTask(planner);
    } else {
      await Promise.all(mapIt(
          packageSetNames,
          packageSetName => target.task(packageSetName).then(taskName => planner.batch(taskName)),
      ));
    }
  },

  /**
   * Creates a task batcher for topmost package.
   *
   * Batches tasks in the topmost package a batcher can be created for.
   *
   * @param provider  A provider of task batcher to plan batch execution with. By default creates a batcher that batches
   * the named task over {@link ZBatcher.batchOverPackageSets each package in each named set}, and ignores targets
   * without matching named package sets.
   *
   * @returns New task batcher.
   */
  topmost(
      this: void,
      provider: ZBatcher.Provider = defaultZBatcherProvider,
  ): ZBatcher {

    let batcher: ZBatcher = async planner => {

      const found = await batcherForZTarget(provider, planner, planner.target);

      if (found) {
        batcher = found[0];
        return batcher(found[1]);
      }

      // Fallback to default batcher.
      batcher = ZBatcher.batchTask;

      return batcher(planner);
    };

    return planner => batcher(planner);
  },

};

/**
 * @internal
 */
function defaultZBatcherProvider(planner: ZBatchPlanner): ZBatcher | undefined {
  return itsEmpty(zPackageSetNames(planner)) ? undefined : ZBatcher.batchOverPackageSets;
}

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

  return makeIt(() => groups.values());
}

/**
 * @internal
 */
async function batcherForZTarget(
    provider: ZBatcher.Provider,
    planner: ZBatchPlanner,
    target: ZPackage,
): Promise<[ZBatcher, ZBatchPlanner] | undefined> {

  const { parent } = target;

  // Try parent package first.
  if (parent) {

    const forParent = await batcherForZTarget(provider, planner, parent);

    if (forParent) {
      // Batch in parent.
      return forParent;
    }
  }

  // Parent package can not be batched.
  // Try here.
  const batchPlanner: ZBatchPlanner = {
    dependent: planner.dependent,
    target,
    taskName: planner.taskName,
    batch(task, details) {
      return planner.batch(task, details);
    },
  };

  const batcher = await provider(batchPlanner);

  return batcher && [batcher, batchPlanner];
}

/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZPackage } from '../packages';
import type { ZCall } from '../plan';
import type { ZTask } from '../tasks';
import type { ZBatchRule } from './batch-rule';
import type { ZBatching } from './batching';

/**
 * Dependencies-first batched tasks execution control.
 */
export interface ZDepsFirstBatches {

  /**
   * Whether batched tasks executed in dependencies-first order to each other.
   */
  readonly isDepsFirst: boolean;

  /**
   * Makes batched tasks execute in dependencies-first order to each other.
   *
   * @param depsFirst  `true` or nothing to execute batched tasks in dependencies-first order, or `false` to execute
   * them in arbitrary order.
   *
   * @returns Updated batching policy.
   */
  depsFirst(depsFirst?: boolean): ZBatching;

}

/**
 * @internal
 */
class ZDepsFirstBatches$ implements ZDepsFirstBatches {

  static newBatchRule(
      context: ZBatchRule.Context<ZDepsFirstBatches>,
      parallel = false,
  ): ZBatchRule.Instance<ZDepsFirstBatches> {

    const control = new ZDepsFirstBatches$(context, parallel);

    return {
      control,
      moveTo(context) {
        return ZDepsFirstBatches$.newBatchRule(context, control.isDepsFirst);
      },
      processBatch({ dependent, isAnnex, batched }) {
        if (isAnnex) {
          return; // Do not order task annexes
        }

        const tasksByTarget = zTasksByTarget(batched);
        const orderedTasks = new Set<ZTask>();
        const orderTaskAndDeps = (task: ZTask): void => {
          if (!orderedTasks.has(task)) {
            orderedTasks.add(task);
            for (const dep of task.target.depGraph().dependencies()) {

              const depTasks = tasksByTarget.get(dep);

              if (depTasks) {
                for (const depTask of depTasks) {
                  dependent.order(depTask, task);
                  orderTaskAndDeps(depTask);
                }
              }
            }
          }
        };

        for (const { task } of batched) {
          orderTaskAndDeps(task);
        }
      },
    };
  }

  private constructor(
      private readonly _context: ZBatchRule.Context<ZDepsFirstBatches>,
      private readonly _depsFirst: boolean,
  ) {
  }

  get isDepsFirst(): boolean {
    return this._depsFirst;
  }

  depsFirst(depsFirst = true): ZBatching {
    return this._context.updateInstance(
        context => depsFirst ? ZDepsFirstBatches$.newBatchRule(context, depsFirst) : undefined,
    );
  }

}

/**
 * Dependencies-first batched tasks execution rule.
 *
 * When enabled, any task {@link ZTask.target targeted} dependent package is executed before the tasks targeted
 * its {@link ZDepGraph.dependencies dependencies}.
 *
 * Dependencies-first mode is enabled {@link ZBatching.newBatching by default}.
 */
export const ZDepsFirstBatches: ZBatchRule<ZDepsFirstBatches> = ZDepsFirstBatches$;

/**
 * @internal
 */
function zTasksByTarget(batched: Iterable<ZCall>): Map<ZPackage, readonly ZTask[]> {

  const result = new Map<ZPackage, ZTask[]>();

  for (const call of batched) {

    const { task } = call;
    const { target } = task;
    const tasks = result.get(target);

    if (tasks) {
      tasks.push(task);
    } else {
      result.set(target, [task]);
    }
  }

  return result;
}

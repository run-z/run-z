import { ZPackage } from '../packages/package.js';
import { ZCall } from '../plan/call.js';
import { ZTask } from '../tasks/task.js';
import { ZBatchRule } from './batch-rule.js';
import { ZBatching } from './batching.js';

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
   * @param depsFirst - `true` or nothing to execute batched tasks in dependencies-first order, or `false` to execute
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
        for (const { task } of batched) {
          dependent.makeParallelWhen(task, isZTaskInIndependentPackage);
        }
        if (isAnnex) {
          return; // Do not order task annexes
        }

        const callsByTarget = zCallsByTarget(batched);
        const orderedCalls = new Set<ZCall>();
        const orderTaskAndDeps = (call: ZCall): void => {
          if (!orderedCalls.has(call)) {
            orderedCalls.add(call);

            const { task } = call;

            for (const dep of task.target.depGraph().dependencies()) {
              const depCalls = callsByTarget.get(dep);

              if (depCalls) {
                for (const depCall of depCalls) {
                  for (const entry of call.entries()) {
                    dependent.order(depCall.task, entry);
                  }
                  orderTaskAndDeps(depCall);
                }
              }
            }
          }
        };

        for (const call of batched) {
          orderTaskAndDeps(call);
        }
      },
    };
  }

  readonly #context: ZBatchRule.Context<ZDepsFirstBatches>;
  readonly #depsFirst: boolean;

  private constructor(context: ZBatchRule.Context<ZDepsFirstBatches>, depsFirst: boolean) {
    this.#context = context;
    this.#depsFirst = depsFirst;
  }

  get isDepsFirst(): boolean {
    return this.#depsFirst;
  }

  depsFirst(depsFirst = true): ZBatching {
    return this.#context.updateInstance(
      (
        context: ZBatchRule.Context<ZDepsFirstBatches>,
      ): ZBatchRule.Instance<ZDepsFirstBatches> | undefined => {
        if (depsFirst) {
          return ZDepsFirstBatches$.newBatchRule(context, depsFirst);
        }

        return;
      },
    );
  }
}

/**
 * Dependencies-first batched tasks execution rule.
 *
 * When enabled, any task {@link ZTask.target targeted} dependent package is executed before the tasks targeted
 * its {@link ZDepGraph.dependencies dependencies}. It also allows to run tasks from independent packages in parallel
 * to each other.
 *
 * Dependencies-first mode is enabled {@link ZBatching.newBatching by default}.
 */
export const ZDepsFirstBatches: ZBatchRule<ZDepsFirstBatches> = ZDepsFirstBatches$;

/**
 * @internal
 */
function isZTaskInIndependentPackage({ target: second }: ZTask, { target: first }: ZTask): boolean {
  return second !== first && !second.depGraph().dependencies().has(first);
}

/**
 * @internal
 */
function zCallsByTarget(batched: Iterable<ZCall>): Map<ZPackage, readonly ZCall[]> {
  const result = new Map<ZPackage, ZCall[]>();

  for (const call of batched) {
    const { target } = call.task;
    const calls = result.get(target);

    if (calls) {
      calls.push(call);
    } else {
      result.set(target, [call]);
    }
  }

  return result;
}

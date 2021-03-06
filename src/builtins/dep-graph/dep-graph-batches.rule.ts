import { noop } from '@proc7ts/primitives';
import type { ZBatching, ZBatchRule, ZPackage, ZTaskParams } from '../../core';

/**
 * Dependency graph batches control.
 */
export interface ZDepGraphBatches {

  /**
   * The part of dependency graph included into task batching.
   *
   * May be one of:
   *
   * - `'dependencies'` for {@link ZDepGraph.dependencies dependencies} of original package, or
   * - `'dependants'` for {@link ZDepGraph.dependants dependants} of original package.
   */
  readonly included: 'dependencies' | 'dependants';

  /**
   * Whether task batching enabled in original package.
   */
  readonly isSelfIncluded: boolean;

  /**
   * Enables task batching in included part of dependency graph.
   *
   * @param included - The part of dependency graph to {@link included include} into task batching.
   * @param includeSelf `true` (the default) to enable task batching in original package, or `false` to disable it.
   *
   * @returns Updated batching policy.
   */
  include(included?: 'dependencies' | 'dependants', includeSelf?: boolean): ZBatching;

  /**
   * Allows task batching disregarding dependency graph.
   *
   * @returns Updated batching policy.
   */
  disable(): ZBatching;

}

/**
 * @internal
 */
class ZDepGraphBatches$ implements ZDepGraphBatches {

  static newBatchRule(
      context: ZBatchRule.Context<ZDepGraphBatches>,
      included: 'dependencies' | 'dependants' = 'dependencies',
      includeSelf = true,
  ): ZBatchRule.Instance<ZDepGraphBatches> {

    const dependants = included === 'dependants';
    const reason = (includeSelf ? 'with-' : 'only-') + included;
    const control = new ZDepGraphBatches$(context, included, includeSelf);

    return {
      control,
      moveTo(context) {
        return ZDepGraphBatches$.newBatchRule(context, control.included, control.isSelfIncluded);
      },
      async processBatch({ dependent, taskName, batched }) {

        const original = dependent.plannedCall.task.target;
        const included = (): ReadonlySet<ZPackage> => {

          const depGraph = original.depGraph();

          return dependants ? depGraph.dependants() : depGraph.dependencies();
        };

        await Promise.all(batched.map(async ({ task }) => dependent.call(
            task,
            {
              params(): ZTaskParams.Partial {
                return task.name !== taskName // Apply only to same-named tasks.
                || (includeSelf && task.target === original) // Include original task?
                || included().has(task.target) // Included in requested part of dep graph?
                    ? {}
                    : { attrs: { skip: [reason] } };
              },
            },
        )));
      },
    };
  }

  constructor(
      private readonly _context: ZBatchRule.Context<ZDepGraphBatches>,
      private readonly _included: 'dependencies' | 'dependants',
      private readonly _isSelfIncluded: boolean,
  ) {
  }

  get included(): 'dependencies' | 'dependants' {
    return this._included;
  }

  get isSelfIncluded(): boolean {
    return this._isSelfIncluded;
  }

  include(included?: 'dependencies' | 'dependants', includeSelf?: boolean): ZBatching {
    return this._context.updateInstance(
        context => ZDepGraphBatches$.newBatchRule(context, included, includeSelf),
    );
  }

  disable(): ZBatching {
    return this._context.updateInstance(noop);
  }

}

/**
 * Dependency graph batches rule.
 *
 * Enables batching in part of dependency graph of original package.
 */
export const ZDepGraphBatches: ZBatchRule<ZDepGraphBatches> = ZDepGraphBatches$;

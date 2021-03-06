import type { ZBatching, ZBatchRule } from '../../core';

/**
 * Parallel batched tasks execution control.
 */
export interface ZParallelBatches {

  /**
   * Whether batched tasks will be executed parallel to each other.
   */
  readonly isParallel: boolean;

  /**
   * Makes batched tasks execute in parallel to each other.
   *
   * @param parallel - `true` or nothing to execute batched tasks in parallel to each other, or `false` to execute them
   * sequentially.
   *
   * @returns Updated batching policy.
   */
  makeParallel(parallel?: boolean): ZBatching;

}

/**
 * @internal
 */
class ZParallelBatches$ implements ZParallelBatches {

  static newBatchRule(
      context: ZBatchRule.Context<ZParallelBatches>,
      parallel = false,
  ): ZBatchRule.Instance<ZParallelBatches> {

    const control = new ZParallelBatches$(context, parallel);

    return {
      control,
      moveTo(context, transiently) {
        return !transiently && ZParallelBatches$.newBatchRule(context, control.isParallel);
      },
      processBatch({ dependent, batched }) {
        dependent.makeParallel(batched.map(({ task }) => task));
      },
    };
  }

  private constructor(
      private readonly _context: ZBatchRule.Context<ZParallelBatches>,
      private readonly _parallel: boolean,
  ) {
  }

  get isParallel(): boolean {
    return this._parallel;
  }

  makeParallel(parallel = true): ZBatching {
    return this._context.updateInstance(
        context => parallel ? ZParallelBatches$.newBatchRule(context, parallel) : undefined,
    );
  }

}

/**
 * Parallel batched tasks execution rule.
 */
export const ZParallelBatches: ZBatchRule<ZParallelBatches> = ZParallelBatches$;

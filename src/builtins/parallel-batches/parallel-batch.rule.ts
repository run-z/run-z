/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZBatching, ZBatchRule } from '../../core';

/**
 * Controller of parallel execution of batched tasks.
 *
 * This class is a batch processing rule.
 */
export interface ZParallelBatch {

  /**
   * Whether batched rules will be executed parallel to each other.
   */
  readonly isParallel: boolean;

  /**
   * Makes batched rules execute in parallel to each other.
   *
   * @param parallel  `true` or nothing to execute batched rules in parallel to each other, or `false` to execute them
   * sequentially.
   *
   * @returns Updated batching policy.
   */
  makeParallel(parallel?: boolean): ZBatching;

}

/**
 * @internal
 */
class ZParallelBatch$ implements ZParallelBatch {

  static newInstance(
      context: ZBatchRule.Context<ZParallelBatch>,
      parallel = false,
  ): ZBatchRule.Instance<ZParallelBatch> {

    const control = new ZParallelBatch$(context, parallel);

    return {
      control,
      moveTo(context, transiently) {
        return !transiently && ZParallelBatch$.newInstance(context, control.isParallel);
      },
      processBatch({ dependent, batched }) {
        dependent.makeParallel(Array.from(batched, call => call.task));
      },
    };
  }

  private constructor(
      private readonly _context: ZBatchRule.Context<ZParallelBatch>,
      private readonly _parallel: boolean,
  ) {
  }

  /**
   * Whether batched rules will be executed parallel to each other.
   */
  get isParallel(): boolean {
    return this._parallel;
  }

  /**
   * Makes batched rules execute in parallel to each other.
   *
   * @param parallel  `true` or nothing to execute batched rules in parallel to each other, or `false` to execute them
   * sequentially.
   */
  makeParallel(parallel = true): ZBatching {
    return this._context.updateInstance(
        context => parallel ? ZParallelBatch$.newInstance(context, parallel) : undefined,
    );
  }

}

/**
 * Parallel batched tasks execution rule.
 */
export const ZParallelBatch: ZBatchRule<ZParallelBatch> = ZParallelBatch$;

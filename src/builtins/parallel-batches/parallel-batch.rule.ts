/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZBatching, ZBatchRule } from '../../core/batches';

/**
 * Controller of parallel execution of batched rules.
 *
 * This class is a batch processing rule.
 */
export class ZParallelBatch {

  static newInstance(
      context: ZBatchRule.Context<ZParallelBatch>,
      parallel = false,
  ): ZBatchRule.Instance<ZParallelBatch> {

    const control = new ZParallelBatch(context, parallel);

    return {
      control,
      moveTo(context, transiently) {
        return !transiently && ZParallelBatch.newInstance(context, control.isParallel);
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
        context => parallel ? ZParallelBatch.newInstance(context, parallel) : undefined,
    );
  }

}

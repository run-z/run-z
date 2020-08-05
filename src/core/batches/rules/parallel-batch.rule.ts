/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZBatchRule } from '../batch-rule';
import type { ZBatching } from '../batching';

/**
 * Controller of parallel execution of batched rules.
 *
 * This class is a batch processing rule.
 */
export class ParallelZBatch {

  static newInstance(
      context: ZBatchRule.Context<ParallelZBatch>,
      parallel = false,
  ): ZBatchRule.Instance<ParallelZBatch> {

    const control = new ParallelZBatch(context, parallel);

    return {
      control,
      moveTo(context) {
        return ParallelZBatch.newInstance(context, control.isParallel);
      },
      processBatch({ dependent, batched }) {
        dependent.makeParallel(Array.from(batched));
      },
    };
  }

  private constructor(
      private readonly _context: ZBatchRule.Context<ParallelZBatch>,
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
        context => parallel ? ParallelZBatch.newInstance(context, parallel) : undefined,
    );
  }

}

import { ZBatchRule } from '../../core/batches/batch-rule.js';
import { ZBatching } from '../../core/batches/batching.js';

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

  readonly #context: ZBatchRule.Context<ZParallelBatches>;
  readonly #parallel: boolean;

  private constructor(context: ZBatchRule.Context<ZParallelBatches>, parallel: boolean) {
    this.#context = context;
    this.#parallel = parallel;
  }

  get isParallel(): boolean {
    return this.#parallel;
  }

  makeParallel(parallel = true): ZBatching {
    return this.#context.updateInstance(
      (
        context: ZBatchRule.Context<ZParallelBatches>,
      ): ZBatchRule.Instance<ZParallelBatches> | undefined => {
        if (parallel) {
          return ZParallelBatches$.newBatchRule(context, parallel);
        }

        return;
      },
    );
  }

}

/**
 * Parallel batched tasks execution rule.
 */
export const ZParallelBatches: ZBatchRule<ZParallelBatches> = ZParallelBatches$;

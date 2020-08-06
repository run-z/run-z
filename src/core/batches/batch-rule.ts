/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZBatch } from './batch';
import type { ZBatching } from './batching';

/**
 * Batch processing rule.
 *
 * When rule {@link ZBatching.rule applied} to batching policy, a rule control instance is created for it.
 * Control instance interface contains methods updating batching policy.
 *
 * @typeparam TControl  A type of batch processing rule control.
 */
export interface ZBatchRule<TControl> {

  /**
   * Create batch processing rule instance.
   *
   * @param context  Batch processing rule context.
   *
   * @returns New batch processing rule instance.
   */
  newInstance(context: ZBatchRule.Context<TControl>): ZBatchRule.Instance<TControl>;

}

export namespace ZBatchRule {

  /**
   * Batch processing rule context.
   *
   * Rule instance can use is to update the rule processing policy.
   *
   * @typeparam TControl  A type of batch processing rule control.
   */
  export interface Context<TControl> {

    /**
     * Updates batch processing policy by replacing the rule processing instance with new one.
     *
     * @param update  A function accepting new processing rule context, and returning either new rule instance or
     * nothing to remove the rule from new batch processing policy.
     *
     * @returns Updated batch processing policy.
     */
    updateInstance(
        update: (this: void, context: Context<TControl>) => Instance<TControl> | null | undefined,
    ): ZBatching;

  }

  /**
   * Batch processing rule instance.
   *
   * Processes batched tasks in arbitrary way. E.g. by making them run in parallel.
   *
   * Instances {@link ZBatchRule.newInstance created} by rules. They should be {@link Context.updateInstance applied}
   * to the policy in order to have effect.
   *
   * @typeparam TControl  A type of batch processing rule control.
   */
  export interface Instance<TControl> {

    /**
     * Batch processing rule control.
     */
    readonly control: TControl;

    /**
     * Applies this instance to another batch processing policy.
     *
     * @param context  Batch processing rule context bound to another processing policy instance.
     * @param transiently  Whether to move to transient policy. E.g. to task prerequisites.
     *
     * @returns Batch processing rule instance bound to new context, or `false` or nothing nothing if the instance
     * is not applicable to new context.
     */
    moveTo(context: Context<TControl>, transiently: boolean): Instance<TControl> | false | null | undefined;

    /**
     * Processes the batch.
     *
     * @param batch  The batch to process.
     *
     * @returns Either nothing if batch processing completed synchronously, or a promise-like instance resolved when
     * the batch processed asynchronously.
     */
    processBatch(batch: ZBatch): void | PromiseLike<unknown>;

  }

}

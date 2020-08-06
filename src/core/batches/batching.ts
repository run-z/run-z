/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZCall } from '../plan';
import type { ZTask, ZTaskSpec } from '../tasks';
import type { ZBatch } from './batch';
import type { ZBatchDetails } from './batch-details';
import type { ZBatchPlanner } from './batch-planner';
import type { ZBatchRule } from './batch-rule';
import type { ZBatcher } from './batcher';
import { batchZTask } from './batcher.impl';

/**
 * Task batching policy.
 *
 * This class instances are immutable.
 */
export class ZBatching {

  private readonly _batcher?: ZBatcher;
  private readonly _rules = new Map<ZBatchRule<unknown>, ZBatchRule.Instance<unknown>>();

  /**
   * Constructs task batching policy.
   *
   * @param batcher  Task batcher to use.
   */
  constructor(batcher?: ZBatcher) {
    this._batcher = batcher;
  }

  /**
   * Updates a batcher to use.
   *
   * @param batcher  New batcher.
   *
   * @returns New batcher policy using the given batcher.
   */
  batchBy(batcher: ZBatcher): ZBatching {

    const newBatcher = new ZBatching(batcher);

    newBatcher._by(this);

    return newBatcher;
  }

  /**
   * Retrieves control instance for batch processing rule.
   *
   * @typeparam TControl  A type of batch processing rule control.
   * @param rule  Batch processing rule to retrieve control of.
   *
   * @returns A control instance for target batch processing rule.
   */
  rule<TControl>(rule: ZBatchRule<TControl>): TControl {

    const instance = this._rules.get(rule);

    return instance
        ? instance.control as TControl
        : rule.newInstance(this._ruleContext(rule)).control;
  }

  /**
   * Merges batching policies.
   *
   * @param other  Batching policy to merge with this one. Its settings have precedence over the ones of this policy.
   *
   * @returns Merged batching policy.
   */
  mergeWith(other: ZBatching): ZBatching {

    const { _batcher: newBatcher = this._batcher } = other;
    const newBatching = new ZBatching(newBatcher);

    newBatching._by(this);
    newBatching._by(other);

    return newBatching;
  }

  private _ruleContext<TControl>(rule: ZBatchRule<TControl>): ZBatchRule.Context<TControl> {

    const oldBatching = this;

    return {
      updateInstance(update) {

        const newBatching = new ZBatching(oldBatching._batcher);

        newBatching._by(oldBatching, rule);

        const newInstance = update(newBatching._ruleContext(rule));

        if (newInstance) {
          newBatching._rules.set(rule, newInstance);
        }

        return newBatching;
      },
    };
  }

  private _by(proto: ZBatching, exceptRule?: ZBatchRule<unknown>): void {
    for (const [rule, ruleInstance] of proto._rules) {
      if (rule !== exceptRule && !this._rules.has(rule)) {
        this._rules.set(rule, ruleInstance.moveTo(this._ruleContext(rule)));
      }
    }
  }

  /**
   * Performs batching.
   *
   * Records tasks to be executed in batch by {@link batchBy batcher} and applies {@link rule batching rules} to them.
   *
   * @param planner  Batch execution planner to record batched task calls to.
   *
   * @returns A promise resolved when batch execution planned.
   */
  async batchAll(planner: ZBatchPlanner): Promise<void> {

    const batched: ZCall[] = [];
    const batchPlanner: ZBatchPlanner = {
      ...planner,
      async batch<TAction extends ZTaskSpec.Action>(
          task: ZTask<TAction>,
          details?: ZBatchDetails<TAction>,
      ): Promise<ZCall> {

        const call = await planner.batch(task, details);

        batched.push(call);

        return call;
      },
    };

    await (this._batcher || batchZTask)(batchPlanner);

    const batch: ZBatch = {
      dependent: planner.dependent,
      taskName: planner.taskName,
      batched,
    };

    for (const ruleInstance of this._rules.values()) {
      await ruleInstance.processBatch(batch);
    }
  }

}

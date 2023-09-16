import { ZCall } from '../plan/call.js';
import { ZTaskSpec } from '../tasks/task-spec.js';
import { ZTask } from '../tasks/task.js';
import { ZBatchDetails } from './batch-details.js';
import { ZBatchPlanner } from './batch-planner.js';
import { ZBatchRule } from './batch-rule.js';
import { ZBatch } from './batch.js';
import { batchZTask } from './batcher.impl.js';
import { ZBatcher } from './batcher.js';
import { ZDepsFirstBatches } from './deps-first-batches.rule.js';

/**
 * Task batching policy.
 *
 * This class instances are immutable.
 */
export class ZBatching {

  /**
   * Creates new task batching policy with default batch processing rules enabled.
   *
   * @param batcher - Task batcher to use.
   *
   * @returns New task batching policy.
   */
  static newBatching(batcher?: ZBatcher): ZBatching {
    return ZBatching.unprocessedBatching(batcher).rule(ZDepsFirstBatches).depsFirst();
  }

  /**
   * Creates new task batching policy without any batch processing rules enabled.
   *
   * @param batcher - Task batcher to use.
   *
   * @returns New task batching policy with default batch processing rules enabled.
   */
  static unprocessedBatching(batcher?: ZBatcher): ZBatching {
    return new ZBatching(batcher);
  }

  private readonly _batcher?: ZBatcher | undefined;
  private readonly _rules = new Map<ZBatchRule<unknown>, ZBatchRule.Instance<unknown>>();

  private constructor(batcher?: ZBatcher) {
    this._batcher = batcher;
  }

  /**
   * Updates a batcher to use.
   *
   * @param batcher - New batcher.
   *
   * @returns New batching policy using the given batcher.
   */
  batchBy(batcher: ZBatcher): ZBatching {
    const newBatcher = new ZBatching(batcher);

    newBatcher._by(this);

    return newBatcher;
  }

  /**
   * Assigns a batcher to use unless already assigned.
   *
   * @param batcher - New batcher.
   *
   * @returns New batching policy using the given batcher, or `this` one if it has a batcher already.
   */
  batchByDefault(batcher: ZBatcher): ZBatching {
    return this._batcher ? this : this.batchBy(batcher);
  }

  /**
   * Retrieves control instance for batch processing rule.
   *
   * @typeParam TControl  A type of batch processing rule control.
   * @param rule - Batch processing rule to retrieve control of.
   *
   * @returns A control instance for target batch processing rule.
   */
  rule<TControl>(rule: ZBatchRule<TControl>): TControl {
    const instance = this._rules.get(rule);

    return instance
      ? (instance.control as TControl)
      : rule.newBatchRule(this._ruleContext(rule)).control;
  }

  /**
   * Merges batching policies.
   *
   * @param other - Batching policy to merge with this one. Its settings have precedence over the ones of this policy.
   *
   * @returns Merged batching policy.
   */
  mergeWith(other: ZBatching): ZBatching {
    return this._mergeWith(other, false);
  }

  /**
   * Merges batching policy with transient one.
   *
   * @param other - Transient batching policy to merge with this one. Its settings have precedence over the ones of this
   * policy.
   *
   * @returns Merged batching policy.
   */
  mergeWithTransient(other: ZBatching): ZBatching {
    return this._mergeWith(other, true);
  }

  private _mergeWith(other: ZBatching, transiently: boolean): ZBatching {
    const { _batcher: newBatcher = this._batcher } = other;
    const newBatching = new ZBatching(newBatcher);

    newBatching._by(this, undefined, transiently);
    newBatching._by(other, undefined, transiently);

    return newBatching;
  }

  private _ruleContext<TControl>(rule: ZBatchRule<TControl>): ZBatchRule.Context<TControl> {
    return {
      updateInstance: update => {
        const newBatching = new ZBatching(this._batcher);

        newBatching._by(this, rule);

        const newInstance = update(newBatching._ruleContext(rule));

        if (newInstance) {
          newBatching._rules.set(rule, newInstance);
        }

        return newBatching;
      },
    };
  }

  private _by(proto: ZBatching, exceptRule?: ZBatchRule<unknown>, transiently = false): void {
    for (const [rule, ruleInstance] of proto._rules) {
      if (rule !== exceptRule && !this._rules.has(rule)) {
        const newInstance = ruleInstance.moveTo(this._ruleContext(rule), transiently);

        if (newInstance) {
          this._rules.set(rule, newInstance);
        }
      }
    }
  }

  /**
   * Performs batching.
   *
   * Records tasks to be executed in batch by {@link batchBy batcher} and applies {@link rule batching rules} to them.
   *
   * @param planner - Batch execution planner to record batched task calls to.
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

    await (this._batcher || batchZTask)(batchPlanner, this);

    const batch: ZBatch = {
      dependent: planner.dependent,
      taskName: planner.taskName,
      isAnnex: planner.isAnnex,
      batched,
    };

    for (const ruleInstance of this._rules.values()) {
      await ruleInstance.processBatch(batch);
    }
  }

}

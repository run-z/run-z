import { valueProvider } from '@proc7ts/primitives';
import type { ZShell } from '../jobs';
import type { ZExecutionJob } from '../jobs/job.impl';
import type { ZTask, ZTaskSpec } from '../tasks';
import type { ZCall } from './call';
import type { ZCallDetails } from './call-details';
import type { ZPlan } from './plan';
import type { ZInstructionRecords } from './planner.impl';
import { ZTaskParams } from './task-params';

/**
 * Task execution parameters evaluator signature.
 *
 * @internal
 */
export type ZCallParams =
  /**
   * @param evaluator - Task parameters evaluation context.
   *
   * @returns Partial task execution parameters.
   */
  (this: void, evaluator: ZTaskParams.Evaluator) => ZTaskParams.Partial;

/**
 * Task execution call depth evaluator signature.
 *
 * This is a function that evaluates the depth of the call. The higher the call depth, the less the priority of
 * the {@link ZTaskParams call parameters} is.
 *
 * @internal
 */
export type ZCallDepth =
  /**
   * @returns The depth of the call.
   */
  (this: void, evaluator: ZTaskParams.Evaluator) => number;

/**
 * @internal
 */
const ZCallDepth__key: ZTaskParams.ValueKey<number> = {
  empty: Number.MAX_VALUE,
};

/**
 * @internal
 */
export class ZCallRecord<TAction extends ZTaskSpec.Action = ZTaskSpec.Action>
  implements ZCall<TAction> {

  // Duplicated here to avoid circular dependency
  static newEvaluator(): ZTaskParams.Evaluator {
    return ZTaskParams.newEvaluator();
  }

  private _currDepth: ZCallDepth;
  private readonly _params: (readonly [params: ZCallParams, depth: ZCallDepth])[] = [];
  private readonly _entries = new Set<ZTask>();

  constructor(
    private readonly _records: ZInstructionRecords,
    private readonly _parent: ZCallRecord | undefined,
    readonly task: ZTask<TAction>,
    details: ZCallDetails<TAction>,
  ) {
    this._currDepth = _parent ? evaluator => _parent._depth(evaluator) + 1 : valueProvider(0);
    this._addParams(details, this._depth.bind(this));
  }

  get plan(): ZPlan {
    return this._records.plan;
  }

  entries(): readonly ZTask[] {
    const entries = this._entries.size ? this._entries : [this.task];
    const result: ZTask[] = [];

    for (const entry of entries) {
      result.push(entry);
      if (entry !== this.task) {
        result.push(...this.plan.callOf(entry).entries());
      }
    }

    return result;
  }

  by(task: ZTask): boolean {
    return this.task === task || (!!this._parent && this._parent.by(task));
  }

  private _depth(evaluator: ZTaskParams.Evaluator): number {
    return evaluator.valueOf(ZCallDepth__key, this, () => this._currDepth(evaluator));
  }

  _call(details: ZCallDetails<TAction>, by: ZCallRecord): this {
    const paramDepth: ZCallDepth = evaluator => by._depth(evaluator) + 1;

    if (!by.by(this.task)) {
      const prevDepth = this._currDepth;

      this._currDepth = evaluator => Math.min(prevDepth(evaluator), paramDepth(evaluator));
    }

    this._addParams(details, paramDepth);

    return this;
  }

  private _addParams(details: ZCallDetails<TAction>, depth: ZCallDepth): void {
    const params = details.params ? details.params.bind(details) : valueProvider({});

    this._params.push([params, depth]);
  }

  async _plan(details: ZCallDetails<TAction>): Promise<void> {
    if (!details.plan) {
      return;
    }

    await details.plan({
      setup: this._records.setup,
      plannedCall: this,
      qualify: this._records.qualify.bind(this._records),
      call: (task, details) => this._records.call(task, details, this),
      order: this._records.order.bind(this._records),
      addEntry: (entry: ZTask) => this._entries.add(entry),
      makeParallel: this._records.makeParallel.bind(this._records),
      makeParallelWhen: this._records.makeParallelWhen.bind(this._records),
    });
  }

  params(evaluator: ZTaskParams.Evaluator): ZTaskParams {
    return evaluator.paramsOf(this, () => {
      // Sort the calls from deepest to closest.
      const allParams = this._params
        .map(([params, depth]): readonly [number, ZCallParams] => [depth(evaluator), params])
        .sort(([firstDepth], [secondDepth]) => secondDepth - firstDepth);

      // Evaluate parameters.
      const result = ZTaskParams.newMutable();

      ZTaskParams.update(result, this.task.callDetails(this).params(evaluator));
      for (const [, params] of allParams) {
        ZTaskParams.update(result, params(evaluator));
      }

      return new ZTaskParams(result);
    });
  }

  prerequisites(): readonly ZCall[] {
    return this._records.prerequisitesOf(this.task);
  }

  hasPrerequisite(task: ZTask): boolean {
    return this._records.isPrerequisiteOf(this.task, task, new Set());
  }

  isParallelTo(other: ZTask): boolean {
    return this._records.areParallel(this.task, other);
  }

  exec(shell: ZShell): ZExecutionJob<TAction> {
    return this._records.executor.exec(this, shell);
  }

}

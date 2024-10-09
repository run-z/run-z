import { valueProvider } from '@proc7ts/primitives';
import { ZExecutionJob } from '../jobs/job.impl.js';
import { ZShell } from '../jobs/shell.js';
import { ZTaskSpec } from '../tasks/task-spec.js';
import { ZTask } from '../tasks/task.js';
import { ZCallDetails } from './call-details.js';
import { ZCall } from './call.js';
import { ZPlan } from './plan.js';
import { ZInstructionRecords } from './planner.impl.js';
import { ZTaskParams } from './task-params.js';

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
  implements ZCall<TAction>
{
  // Duplicated here to avoid circular dependency
  static newEvaluator(): ZTaskParams.Evaluator {
    return ZTaskParams.newEvaluator();
  }

  readonly #records: ZInstructionRecords;
  readonly #parent: ZCallRecord | undefined;
  #currDepth: ZCallDepth;
  readonly #params: (readonly [params: ZCallParams, depth: ZCallDepth])[] = [];
  readonly #entries = new Set<ZTask>();

  constructor(
    records: ZInstructionRecords,
    parent: ZCallRecord | undefined,
    readonly task: ZTask<TAction>,
    details: ZCallDetails<TAction>,
  ) {
    this.#records = records;
    this.#parent = parent;
    this.#currDepth = parent ? evaluator => parent.#depth(evaluator) + 1 : valueProvider(0);
    this.#addParams(details, this.#depth.bind(this));
  }

  get plan(): ZPlan {
    return this.#records.plan;
  }

  entries(): readonly ZTask[] {
    const entries = this.#entries.size ? this.#entries : [this.task];
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
    return this.task === task || (!!this.#parent && this.#parent.by(task));
  }

  #depth(evaluator: ZTaskParams.Evaluator): number {
    return evaluator.valueOf(ZCallDepth__key, this, () => this.#currDepth(evaluator));
  }

  _call(details: ZCallDetails<TAction>, by: ZCallRecord): this {
    const paramDepth: ZCallDepth = evaluator => by.#depth(evaluator) + 1;

    if (!by.by(this.task)) {
      const prevDepth = this.#currDepth;

      this.#currDepth = evaluator => Math.min(prevDepth(evaluator), paramDepth(evaluator));
    }

    this.#addParams(details, paramDepth);

    return this;
  }

  #addParams(details: ZCallDetails<TAction>, depth: ZCallDepth): void {
    const params = details.params ? details.params.bind(details) : valueProvider({});

    this.#params.push([params, depth]);
  }

  async _plan(details: ZCallDetails<TAction>): Promise<void> {
    if (!details.plan) {
      return;
    }

    await details.plan({
      setup: this.#records.setup,
      plannedCall: this,
      qualify: this.#records.qualify.bind(this.#records),
      call: (task, details) => this.#records.call(task, details, this),
      order: this.#records.order.bind(this.#records),
      addEntry: (entry: ZTask) => this.#entries.add(entry),
      makeParallel: this.#records.makeParallel.bind(this.#records),
      makeParallelWhen: this.#records.makeParallelWhen.bind(this.#records),
    });
  }

  params(evaluator: ZTaskParams.Evaluator): ZTaskParams {
    return evaluator.paramsOf(this, () => {
      // Sort the calls from deepest to closest.
      const allParams = this.#params
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
    return this.#records.prerequisitesOf(this.task);
  }

  hasPrerequisite(task: ZTask): boolean {
    return this.#records.isPrerequisiteOf(this.task, task, new Set());
  }

  isParallelTo(other: ZTask): boolean {
    return this.#records.areParallel(this.task, other);
  }

  exec(shell: ZShell): ZExecutionJob<TAction> {
    return this.#records.executor.exec(this, shell);
  }
}

import { valueProvider } from '@proc7ts/primitives';
import type { ZTask, ZTaskSpec } from '../tasks';
import type { ZCall } from './call';
import type { ZCallInstruction } from './call-instruction';
import type { ZExecutionJob } from './job.impl';
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
 * @returns Partial task execution parameters.
 */
    (this: void) => ZTaskParams.Partial;

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
    (this: void) => number;

/**
 * @internal
 */
export class ZCallRecord<TAction extends ZTaskSpec.Action = ZTaskSpec.Action> implements ZCall<TAction> {

  readonly task: ZTask<TAction>;
  private _currDepth: ZCallDepth;
  private readonly _params: (readonly [ZCallParams, ZCallDepth])[] = [];
  private _builtParams: readonly [number, ZTaskParams] | [] = [];

  constructor(
      private readonly _records: ZInstructionRecords,
      private readonly _parent: ZCallRecord | undefined,
      instruction: ZCallInstruction<TAction>,
  ) {
    this.task = instruction.task;
    this._currDepth = _parent ? () => _parent._depth() + 1 : valueProvider(0);
    this._addParams(instruction, this._depth.bind(this));
  }

  get plan(): ZPlan {
    return this._records.plan;
  }

  private _ofTask(task: ZTask): true | undefined {
    return this.task === task || this._parent?._ofTask(task);
  }

  private _depth(): number {
    return this._currDepth();
  }

  _call(instruction: ZCallInstruction, by: ZCallRecord): this {

    const paramDepth: ZCallDepth = () => by._depth() + 1;

    if (!by._ofTask(this.task)) {

      const prevDepth = this._currDepth;

      this._currDepth = () => Math.min(prevDepth(), paramDepth());
    }

    this._addParams(instruction, paramDepth);

    return this;
  }

  private _addParams(instruction: ZCallInstruction, depth: ZCallDepth): void {

    const params = instruction.params ? instruction.params.bind(instruction) : valueProvider({});

    this._params.push([params, depth]);
  }

  async _plan(instruction: ZCallInstruction<TAction> | ZTask<TAction>): Promise<void> {
    if (!instruction.plan) {
      return;
    }

    await instruction.plan({
      setup: this._records.setup,
      plannedCall: this,
      qualify: this._records.qualify.bind(this._records),
      call: instr => this._records.call(instr, this),
      order: this._records.order.bind(this._records),
      makeParallel: this._records.makeParallel.bind(this._records),
    });
  }

  params(): ZTaskParams {

    const [rev, cached] = this._builtParams;

    if (rev === this._records.rev) {
      return cached as ZTaskParams;
    }

    // Sort the calls from deepest to closest.
    const allParams = this._params.map(
        ([params, depth]) => [depth(), params] as const,
    ).sort(
        ([firstDepth], [secondDepth]) => secondDepth - firstDepth,
    );

    // Evaluate parameters.
    const result: ZTaskParams.Mutable = { attrs: {}, args: [], actionArgs: [] };

    ZTaskParams.update(result, this.task.params());
    for (const [, params] of allParams) {
      ZTaskParams.update(result, params());
    }

    const params = new ZTaskParams(result);

    this._builtParams = [this._records.rev, params];

    return params;
  }

  extendParams(extension: ZTaskParams.Partial): (this: void) => ZTaskParams {
    return () => this.params().extend(extension);
  }

  prerequisites(): Iterable<ZCall> {
    return this._records.prerequisitesOf(this.task);
  }

  hasPrerequisite(task: ZTask): boolean {
    return this._records.isPrerequisiteOf(this.task, task, new Set());
  }

  isParallelTo(other: ZTask): boolean {
    return this._records.areParallel(this.task, other);
  }

  exec(): ZExecutionJob<TAction> {
    return this._records.executor.exec(this);
  }

}

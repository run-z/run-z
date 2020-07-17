import { overNone, thruIt } from '@proc7ts/a-iterable';
import { nextSkip } from '@proc7ts/call-thru';
import { valueProvider } from '@proc7ts/primitives';
import type { ZSetup } from '../setup';
import type { ZTask, ZTaskSpec } from '../tasks';
import { UnknownZTaskError } from '../tasks';
import type { ZCall } from './call';
import type { ZCallInstruction } from './call-instruction';
import type { ZPlan } from './plan';
import { ZTaskParams } from './task-params';

/**
 * Task execution parameters evaluator signature.
 *
 * @internal
 */
type ZCallParams =
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
type ZCallDepth =
/**
 * @returns The depth of the call.
 */
    (this: void) => number;

/**
 * @internal
 */
export class ZInstructionRecords {

  rev = 0;
  readonly plan: ZPlan;
  private readonly _calls = new Map<ZTask, ZCallRecord>();
  private readonly _prerequisites = new Map<ZTask, Set<ZTask>>();
  private readonly _parallel = new Map<ZTask, Set<ZTask>>();

  constructor(readonly setup: ZSetup) {
    this.plan = {
      calls: () => this._calls.values(),
      callOf: <TAction extends ZTaskSpec.Action>(task: ZTask<TAction>): ZCall<TAction> => {

        const call = this._calls.get(task) as ZCallRecord<TAction> | undefined;

        if (!call) {
          throw new UnknownZTaskError(
              task.target.name,
              task.name,
              `Task "${task.name}" from <${task.target.name}> is never called`,
          );
        }

        return call;
      },
    };
  }

  async call<TAction extends ZTaskSpec.Action>(
      instruction: ZCallInstruction<TAction>,
      by?: ZCallRecord,
  ): Promise<ZCall<TAction>> {
    ++this.rev;

    const { task } = instruction;
    let call = this._calls.get(task) as ZCallRecord<TAction> | undefined;

    if (call) {
      call._call(instruction, by!); // `by` always known here
    } else {
      call = new ZCallRecord(this, by, instruction);
      this._calls.set(task, call);
      await call._plan(task);
    }
    await call._plan(instruction);

    return call;
  }

  order(tasks: readonly ZTask[]): void {
    for (let i = tasks.length - 1; i > 0; --i) {

      const next = tasks[i];
      const prev = tasks[i - 1];
      const prerequisites = this._prerequisites.get(next);

      if (prerequisites) {
        prerequisites.add(prev);
      } else {
        this._prerequisites.set(next, new Set<ZTask>().add(prev));
      }
    }
  }

  prerequisitesOf(dependent: ZTask): Iterable<ZCall> {

    const prerequisites = this._prerequisites.get(dependent);

    if (!prerequisites) {
      return overNone();
    }

    return thruIt(
        prerequisites,
        task => this._calls.get(task) || nextSkip,
    );
  }

  isPrerequisiteOf(target: ZTask, toCheck: ZTask, checked: Set<ZTask>): boolean {
    if (checked.has(target)) {
      return false;
    }
    checked.add(target);

    const prerequisites = this._prerequisites.get(target);

    if (!prerequisites) {
      return false;
    }
    if (prerequisites.has(toCheck)) {
      return true;
    }
    for (const prerequisite of prerequisites) {
      this.isPrerequisiteOf(prerequisite, toCheck, checked);
    }

    return false;
  }

  prerequisiteSetOf(dependent: ZTask): ReadonlySet<ZTask> {

    const prerequisites = this._prerequisites.get(dependent);

    if (!prerequisites) {
      return new Set();
    }

    return prerequisites;
  }

  makeParallel(tasks: readonly ZTask[]): void {
    for (let i = tasks.length - 1; i > 0; --i) {

      const first = tasks[i];
      let parallels = this._parallel.get(first);

      if (!parallels) {
        parallels = new Set();
        this._parallel.set(first, parallels);
      }

      for (let j = i - 1; j >= 0; --j) {
        parallels.add(tasks[j]);
      }
    }
  }

  areParallel(first: ZTask, second: ZTask): boolean {

    const parallels = this._parallel.get(first);

    if (parallels && parallels.has(second)) {
      return true;
    }

    const parallels2 = this._parallel.get(second);

    return !!parallels2 && parallels2.has(first);
  }

}

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

}

import { overNone, thruIt } from '@proc7ts/a-iterable';
import { nextSkip } from '@proc7ts/call-thru';
import { valueProvider } from '@proc7ts/primitives';
import type { ZSetup } from '../setup';
import type { ZTask, ZTaskSpec } from '../tasks';
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
  private readonly _requirements = new Map<ZTask, ZTask[]>();
  private readonly _parallel = new Map<ZTask, Set<ZTask>>();

  constructor(readonly setup: ZSetup) {
    this.plan = {
      calls: () => this._calls.values(),
      callOf: task => this._calls.get(task),
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

  require(dependent: ZTask, dependency: ZTask): void {

    const requirements = this._requirements.get(dependent);

    if (requirements) {
      requirements.push(dependency);
    } else {
      this._requirements.set(dependent, [dependency]);
    }
  }

  requiredBy(dependent: ZTask): Iterable<ZCall> {

    const requirements = this._requirements.get(dependent);

    if (!requirements) {
      return overNone();
    }

    return thruIt(
        requirements,
        task => this._calls.get(task) || nextSkip,
    );
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

  private _ofTask(task: ZTask): true | undefined {
    return this.task === task || this._parent?._ofTask(task);
  }

  private _depth(): number {
    return this._currDepth();
  }

  _call(instruction: ZCallInstruction, by: ZCallRecord): this {

    let paramDepth: ZCallDepth;

    if (by._ofTask(this.task)) {
      // Prevent infinite recursion when calculating depth.
      paramDepth = () => by._depth() + 1;
    } else {

      const prevDepth = this._currDepth;

      paramDepth = this._currDepth = () => Math.min(prevDepth(), by._depth() + 1);
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
      require: this._records.require.bind(this._records),
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

  required(): Iterable<ZCall> {
    return this._records.requiredBy(this.task);
  }

  parallelWith(other: ZTask): boolean {
    return this._records.areParallel(this.task, other);
  }

}

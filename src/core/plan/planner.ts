/**
 * @packageDocumentation
 * @module run-z
 */
import { overNone, thruIt } from '@proc7ts/a-iterable';
import { nextSkip } from '@proc7ts/call-thru';
import { valueProvider } from '@proc7ts/primitives';
import type { ZSetup } from '../setup';
import type { ZTask } from '../tasks';
import type { ZCall, ZCallParams } from './call';
import { ZCallRecord, ZPlanRecords } from './call.impl';
import type { ZInstruction } from './instruction';
import type { ZPlan } from './plan';
import type { ZPlanRecorder } from './plan-recorder';

/**
 * Task execution planner.
 */
export class ZPlanner {

  /**
   * Constructs execution planner.
   *
   * @param setup  Task execution setup.
   */
  constructor(readonly setup: ZSetup) {
  }

  async plan(instruction: ZInstruction): Promise<ZPlan> {

    const records = new ZInstructionRecords(this.setup);

    await records.follow(instruction, valueProvider(0));

    return records.plan;
  }

}

/**
 * @internal
 */
class ZInstructionRecords implements ZPlanRecords {

  rev = 0;
  readonly plan: ZPlan;
  private readonly _instructions = new Map<ZInstruction, ZInstructionRecord>();
  private readonly _calls = new Map<ZTask, ZCallRecord>();
  private readonly _requirements = new Map<ZTask, ZTask[]>();
  private readonly _parallel = new Map<ZTask, Set<ZTask>>();

  constructor(readonly setup: ZSetup) {
    this.plan = {
      calls: () => this._calls.values(),
      callOf: task => this._calls.get(task),
    };
  }

  async follow(instruction: ZInstruction, depth: (this: void) => number): Promise<void> {
    ++this.rev;

    let record = this._instructions.get(instruction);

    if (record) {
      record.reuse(depth);
    } else {
      record = new ZInstructionRecord(this, instruction, depth);
      this._instructions.set(instruction, record);
      await record.init(instruction);
    }
  }

  async call(
      task: ZTask,
      by: ZInstructionRecord,
      params: ZCallParams = valueProvider({}),
  ): Promise<ZCall> {
    ++this.rev;

    const depth: (this: void) => number = task.instruction === by.of
        ? valueProvider(Number.POSITIVE_INFINITY)
        : by.depth.bind(by);
    let call = this._calls.get(task);

    if (call) {
      call.call(params, depth);
    } else {
      call = new ZCallRecord(this, task, params, depth);
      this._calls.set(task, call);
      await by.recorder.follow(call.task.instruction);
    }

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
class ZInstructionRecord {

  private _depth: (this: void) => number;
  readonly recorder: ZPlanRecorder;

  constructor(
      records: ZInstructionRecords,
      readonly of: ZInstruction,
      depth: (this: void) => number,
  ) {
    this._depth = depth;
    this.recorder = {
      setup: records.setup,
      follow: instruction => records.follow(instruction, () => this._depth() + 1),
      call: (task, details) => records.call(task, this, details),
      require: records.require.bind(records),
      makeParallel: records.makeParallel.bind(records),
    };
  }

  depth(): number {
    return this._depth();
  }

  async init(instruction: ZInstruction): Promise<void> {
    await instruction(this.recorder);
  }

  reuse(depth: (this: void) => number): void {

    const prevDepth = this._depth;

    this._depth = () => Math.min(prevDepth(), depth());
  }

}

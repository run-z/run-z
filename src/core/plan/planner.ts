/**
 * @packageDocumentation
 * @module run-z
 */
import { valueProvider } from '@proc7ts/primitives';
import type { ZSetup } from '../setup';
import type { ZTask } from '../tasks';
import type { ZCall, ZCallParams } from './call';
import { ZCallRecord } from './call.impl';
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

    return records.plan();
  }

}

/**
 * @internal
 */
class ZInstructionRecords {

  rev = 0;
  private readonly _instructions = new Map<ZInstruction, ZInstructionRecord>();
  private readonly _calls = new Map<ZTask, ZCallRecord>();

  constructor(readonly setup: ZSetup) {
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

  plan(): ZPlan {
    return {
      calls: () => this._calls.values(),
      callOf: task => this._calls.get(task),
    };
  }

}

/**
 * @internal
 */
class ZInstructionRecord {

  private _depth: (this: void) => number;
  readonly recorder: ZPlanRecorder;

  constructor(
      private readonly records: ZInstructionRecords,
      readonly of: ZInstruction,
      depth: (this: void) => number,
  ) {
    this._depth = depth;
    this.recorder = {
      setup: this.records.setup,
      follow: instruction => this.records.follow(instruction, () => this._depth() + 1),
      call: (task, details) => this.records.call(task, this, details),
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

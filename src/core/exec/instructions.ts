/**
 * @packageDocumentation
 * @module run-z
 */
import { mapIt } from '@proc7ts/a-iterable';
import { valueProvider } from '@proc7ts/primitives';
import type { ZPackageResolver } from '../packages';
import type { ZTask, ZTaskDetails } from '../tasks';
import type { ZInstruction } from './instruction';
import type { ZInstructionRecorder } from './instruction-recorder';

export type ZInstructions = Iterable<readonly [ZTask, ZTaskDetails]>;

export const ZInstructions = {

  async by(
      instruction: ZInstruction,
      { resolver }: { resolver: ZPackageResolver },
  ): Promise<ZInstructions> {

    const records = new ZInstructionRecords(resolver);

    await records.follow(instruction, valueProvider(0));

    return records.instructions();
  },

};

/**
 * @internal
 */
class ZInstructionRecords {

  private readonly _instructions = new Map<ZInstruction, ZInstructionRecord>();
  private readonly _tasks = new Map<ZTask, ZTaskRecord>();

  constructor(readonly resolver: ZPackageResolver) {
  }

  async follow(instruction: ZInstruction, depth: (this: void) => number): Promise<void> {

    const record = this._instructions.get(instruction);

    if (record) {
      record.reuse(depth);
    } else {

      const newRecord = new ZInstructionRecord(this, instruction, depth);

      this._instructions.set(instruction, newRecord);

      await newRecord.as(instruction);
    }
  }

  run(
      task: ZTask,
      by: ZInstructionRecord,
      details: (this: void) => Partial<ZTaskDetails> = valueProvider({}),
  ): (this: void) => ZTaskDetails {

    const depth: (this: void) => number = task === by.of
        ? valueProvider(Number.POSITIVE_INFINITY)
        : by.depth.bind(by);
    let record = this._tasks.get(task);

    if (record) {
      record.refine(depth, details);
    } else {
      this._tasks.set(task, record = new ZTaskRecord(task, depth, details));
    }

    return record.details.bind(details);
  }

  instructions(): ZInstructions {
    return mapIt(
        this._tasks.entries(),
        ([task, record]) => [task, record.details()],
    );
  }

}

/**
 * @internal
 */
class ZInstructionRecord {

  private _depth: (this: void) => number;

  constructor(
      private readonly records: ZInstructionRecords,
      readonly of: ZInstruction,
      depth: (this: void) => number,
  ) {
    this._depth = depth;
  }

  depth(): number {
    return this._depth();
  }

  async as(instruction: ZInstruction): Promise<this> {

    const recorder: ZInstructionRecorder = {
      resolver: this.records.resolver,
      depth: () => this._depth(),
      follow: instruction => this.records.follow(instruction, () => this._depth() + 1),
      fulfil: (task, details) => this.records.run(task, this, details),
    };

    await instruction.instruct(recorder);

    return this;
  }

  reuse(depth: (this: void) => number): void {

    const prevDepth = this._depth;

    this._depth = () => Math.min(prevDepth(), depth());
  }

}

/**
 * @internal
 */
class ZTaskRecord {

  private readonly _details: (readonly [(this: void) => number, (this: void) => Partial<ZTaskDetails>])[];

  constructor(
      readonly task: ZTask,
      depth: (this: void) => number,
      details: (this: void) => Partial<ZTaskDetails>,
  ) {
    this._details = [[depth, details]];
  }

  details(): ZTaskDetails {

    // Sort task details from deepest to closest
    const details = this._details.map(
        ([depth, details]) => [depth(), details] as const,
    ).sort(
        ([firstDepth], [secondDepth]) => secondDepth - firstDepth,
    );

    // Apply task details
    const attrs: Record<string, string[]> = {};
    const args: string[] = [];
    const commandArgs: string[] = [];

    for (const [, getDetails] of details) {

      const { attrs: newAttrs = {}, args: newArgs = [], actionArgs: newCommandArgs = [] } = getDetails();

      Object.assign(attrs, newAttrs);
      args.push(...newArgs);
      commandArgs.push(...newCommandArgs);
    }

    return {
      attrs,
      args,
      actionArgs: commandArgs,
    };
  }

  refine(depth: (this: void) => number, details: (this: void) => Partial<ZTaskDetails>): void {
    this._details.push([depth, details]);
  }

}

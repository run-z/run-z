/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZSetup } from '../setup';
import type { ZTaskSpec } from '../tasks';
import type { ZCall } from './call';
import type { ZCallInstruction } from './call-instruction';
import { ZInstructionRecords } from './planner.impl';

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

  /**
   * Builds a task execution plan.
   *
   * The plan would execute the task after executing all of its prerequisites.
   *
   * @typeparam TAction  Task action type.
   * @param instruction  Top-level task call instruction.
   *
   * @returns Top-level task execution call.
   */
  async plan<TAction extends ZTaskSpec.Action>(
      instruction: ZCallInstruction<TAction>,
  ): Promise<ZCall<TAction>> {

    const records = new ZInstructionRecords(this.setup);

    await records.call(instruction);

    return records.plan.callOf(instruction.task);
  }

}

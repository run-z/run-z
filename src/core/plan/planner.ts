/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZSetup } from '../setup';
import type { ZCallInstruction } from './call-instruction';
import type { ZPlan } from './plan';
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
   * The plan would execute the task after executing all of its dependencies.
   *
   * @param instruction  Top-level task call instruction.
   *
   * @returns New task execution plan.
   */
  async plan(instruction: ZCallInstruction): Promise<ZPlan> {

    const records = new ZInstructionRecords(this.setup);

    await records.call(instruction);

    return records.plan;
  }

}

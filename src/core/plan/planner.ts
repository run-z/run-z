/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZSetup } from '../setup';
import type { ZTask, ZTaskSpec } from '../tasks';
import type { ZCall } from './call';
import type { ZCallDetails } from './call-details';
import { ZInstructionRecords } from './planner.impl';

/**
 * Task execution planner.
 */
export class ZPlanner {

  /**
   * Constructs execution planner.
   *
   * @param setup - Task execution setup.
   */
  constructor(readonly setup: ZSetup) {
  }

  /**
   * Plans a top-level task execution.
   *
   * The plan would execute the task after executing all of its prerequisites.
   *
   * @typeparam TAction  Task action type.
   * @param task - Top-level task to call.
   * @param details - Task call details.
   *
   * @returns A promise resolved to top-level task execution call.
   */
  async call<TAction extends ZTaskSpec.Action>(
      task: ZTask<TAction>,
      details?: ZCallDetails<TAction>,
  ): Promise<ZCall<TAction>> {

    const records = new ZInstructionRecords(this.setup);

    await records.call(task, details);

    return records.plan.callOf(task);
  }

}

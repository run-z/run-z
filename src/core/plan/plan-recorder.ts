/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZSetup } from '../setup';
import type { ZTask } from '../tasks';
import type { ZCall, ZCallParams } from './call';
import type { ZInstruction } from './instruction';

/**
 * Task execution plan recorder.
 */
export interface ZPlanRecorder {

  /**
   * Task execution setup instance.
   */
  readonly setup: ZSetup;

  /**
   * Makes the plan follow the given instruction.
   *
   * @param instruction  Execution instruction to follow.
   *
   * @returns A promise resolved when the given `instruction` is recorded.
   */
  follow(instruction: ZInstruction): Promise<void>;

  /**
   * Makes the plan contain a call to the given task.
   *
   * {@link ZCall.refine Refines the call} if the call to the same task is already recorded.
   *
   * @param task  The task to call.
   * @param params  A function evaluating parameters of the call.
   *
   * @returns A promise resolved to the call when it is recorded.
   */
  call(task: ZTask, params?: ZCallParams): Promise<ZCall>;

}
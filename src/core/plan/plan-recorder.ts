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
   * Records a call to the given task.
   *
   * Updates already recorded call to the same task.
   *
   * @param task  The task to call.
   * @param params  A function evaluating parameters of the call.
   *
   * @returns A promise resolved to the call when it is recorded.
   */
  call(task: ZTask, params?: ZCallParams): Promise<ZCall>;

  /**
   * Make a task require another one.
   *
   * @param dependent  Dependent task.
   * @param dependency  Dependency task.
   */
  require(dependent: ZTask, dependency: ZTask): void;

  /**
   * Allow parallel tasks execution.
   *
   * @param tasks  Tasks that can be executed in parallel to each other.
   */
  makeParallel(tasks: readonly ZTask[]): void;

}

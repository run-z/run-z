/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZSetup } from '../setup';
import type { ZTask, ZTaskSpec } from '../tasks';
import type { ZCall } from './call';
import type { ZCallInstruction } from './call-instruction';

/**
 * Task execution planner.
 *
 * It is used to record task execution instructions.
 *
 * @typeparam TAction  Task action type.
 */
export interface ZCallPlanner<TAction extends ZTaskSpec.Action> {

  /**
   * Task execution setup instance.
   */
  readonly setup: ZSetup;

  /**
   * Planned task call.
   *
   * All instructions recorded by this planner are related to this call.
   */
  readonly plannedCall: ZCall<TAction>;

  /**
   * Records a call to a task.
   *
   * Updates already recorded call to the same task.
   *
   * @typeparam TAction  Task action type.
   * @param instruction  An instruction for the task call to record.
   *
   * @returns A promise resolved to the task call when it is recorded.
   */
  call<TAction extends ZTaskSpec.Action>(instruction: ZCallInstruction<TAction>): Promise<ZCall<TAction>>;

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

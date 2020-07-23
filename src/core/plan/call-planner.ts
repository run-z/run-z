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
export interface ZCallPlanner<TAction extends ZTaskSpec.Action = ZTaskSpec.Action> {

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
   * Establishes the task execution order.
   *
   * The call to this method does not cause any of the tasks to be executed.
   *
   * When any of the tasks executed it first executes its prerequisites. I.e. the tasks ordered before it.
   * The task itself will be executed only after each prerequisite completes, unless that prerequisite can be executed
   * {@link makeParallel in parallel}.
   *
   * Contradictory execution order causes one of the tasks to be executed before prerequisite.
   *
   * @param first  The task executed first.
   * @param second  The task executed after the first one.
   */
  order(first: ZTask, second: ZTask): void;

  /**
   * Allow parallel tasks execution.
   *
   * The call to this method does not cause any of the tasks to be executed.
   *
   * @param tasks  Array of tasks that can be executed in parallel to each other.
   */
  makeParallel(tasks: readonly ZTask[]): void;

}

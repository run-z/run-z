/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZTask, ZTaskSpec } from '../tasks';
import type { ZPlan } from './plan';
import type { ZTaskParams } from './task-params';

/**
 * A call for task execution.
 *
 * @typeparam TAction  Task action type.
 */
export interface ZCall<TAction extends ZTaskSpec.Action = ZTaskSpec.Action> {

  /**
   * Execution plan.
   */
  readonly plan: ZPlan;

  /**
   * A task to call.
   */
  readonly task: ZTask<TAction>;

  /**
   * Evaluates task execution parameters.
   *
   * @returns Task execution parameters instance.
   */
  params(): ZTaskParams;

  /**
   * Returns this task execution dependencies.
   *
   * @returns An iterable of required task execution calls.
   *
   * @see ZCallPlanner.require
   */
  required(): Iterable<ZCall>;

  /**
   * Whether this task call can be executed in parallel with the a call to another task.
   *
   * @param other  The task to check.
   *
   * @returns `true` is tasks can be executed in parallel, or `false` otherwise.
   *
   * @see ZCallPlanner.makeParallel
   */
  parallelWith(other: ZTask): boolean;

  /**
   * Extends this call parameters with the given extension.
   *
   * @param extension  Task parameters extension.
   *
   * @returns Extended task parameters evaluator.
   */
  extendParams(extension: ZTaskParams.Partial): (this: void) => ZTaskParams;

}

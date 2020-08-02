/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZJob } from '../jobs';
import type { ZTask, ZTaskSpec } from '../tasks';
import type { ZPlan } from './plan';
import type { ZTaskParams } from './task-params';

/**
 * A call for task execution.
 *
 * There is at most one call instance per task exists. Subsequent calls just {@link ZTaskParams.update update} its
 * parameters.
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
   * Returns immediate prerequisites of this task.
   *
   * @returns An iterable of task execution calls to make before this one.
   *
   * @see ZCallPlanner.order
   */
  prerequisites(): Iterable<ZCall>;

  /**
   * Checks whether a call to the given task is a prerequisite of this one.
   *
   * Checks recursively among all immediate and deep prerequisites.
   *
   * @param task  The task to check.
   *
   * @returns `true` if the given `task` is {@link ZCallPlanner.order ordered} before this one, or `false` otherwise.
   */
  hasPrerequisite(task: ZTask): boolean;

  /**
   * Checks whether this task call can be executed in parallel to a call to the given task.
   *
   * @param task  The task to check.
   *
   * @returns `true` if tasks can be executed in parallel, or `false` otherwise.
   *
   * @see ZCallPlanner.makeParallel
   */
  isParallelTo(task: ZTask): boolean;

  /**
   * Extends this call parameters with the given extension.
   *
   * @param extension  Task parameters extension.
   *
   * @returns Extended task parameters evaluator.
   */
  extendParams(extension: ZTaskParams.Partial): (this: void) => ZTaskParams;

  /**
   * Executes this call.
   *
   * @returns Either new task execution job, or the one already started.
   */
  exec(): ZJob<TAction>;

}

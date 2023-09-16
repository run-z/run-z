import { ZJob } from '../jobs/job.js';
import { ZShell } from '../jobs/shell.js';
import { ZTaskSpec } from '../tasks/task-spec.js';
import { ZTask } from '../tasks/task.js';
import { ZPlan } from './plan.js';
import { ZTaskParams } from './task-params.js';

/**
 * A call for task execution.
 *
 * There is at most one call instance per task exists. Subsequent calls just {@link ZTaskParams.update update} its
 * parameters.
 *
 * @typeParam TAction  Task action type.
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
   * @param evaluator - Task parameters evaluator.
   *
   * @returns Task execution parameters instance.
   */
  params(evaluator: ZTaskParams.Evaluator): ZTaskParams;

  /**
   * Returns the entry tasks of the called task execution.
   *
   * The entry tasks executed before the called task execution. This is either the task itself, or its first
   * prerequisite with its entries.
   *
   * @returns An iterable of tasks to be executed.
   *
   * @see ZCallPlanner.addEntry
   */
  entries(): readonly ZTask[];

  /**
   * Returns immediate prerequisites of this task.
   *
   * @returns An iterable of task execution calls to make before this one.
   *
   * @see ZCallPlanner.order
   */
  prerequisites(): readonly ZCall[];

  /**
   * Checks whether a call to the given task is a prerequisite of this one.
   *
   * Checks recursively among all immediate and deep prerequisites.
   *
   * @param task - The task to check.
   *
   * @returns `true` if the given `task` is {@link ZCallPlanner.order ordered} before this one, or `false` otherwise.
   */
  hasPrerequisite(task: ZTask): boolean;

  /**
   * Checks whether this task call can be executed in parallel to a call to the given task.
   *
   * @param task - The task to check.
   *
   * @returns `true` if tasks can be executed in parallel, or `false` otherwise.
   *
   * @see ZCallPlanner.makeParallel
   */
  isParallelTo(task: ZTask): boolean;

  /**
   * Executes this call.
   *
   * @param shell - Task execution shell.
   *
   * @returns Either new task execution job, or the one already started.
   */
  exec(shell: ZShell): ZJob<TAction>;
}

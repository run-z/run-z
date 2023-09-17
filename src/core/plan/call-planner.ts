import { ZSetup } from '../setup.js';
import { ZTaskSpec } from '../tasks/task-spec.js';
import { ZTask, ZTaskQualifier } from '../tasks/task.js';
import { ZCallDetails } from './call-details.js';
import { ZCall } from './call.js';

/**
 * Task execution planner.
 *
 * It is used to record task execution instructions.
 *
 * @typeParam TAction  Task action type.
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
   * Qualifies the task.
   *
   * Add the given qualifier to the task.
   *
   * @param task - Target task to add qualifier to.
   * @param qualifier - Qualifier to add to the task.
   */
  qualify(this: void, task: ZTask, qualifier: ZTaskQualifier): void;

  /**
   * Records a call to the task.
   *
   * Updates already recorded call to the same task.
   *
   * @typeParam TAction  Task action type.
   * @param task - The task to call.
   * @param details - The details of the call.
   *
   * @returns A promise resolved to the task call when it is recorded.
   */
  call<TAction extends ZTaskSpec.Action>(
    this: void,
    task: ZTask<TAction>,
    details?: ZCallDetails<TAction>,
  ): Promise<ZCall<TAction>>;

  /**
   * Establishes the task execution order.
   *
   * The call to this method does not cause any of the tasks to be executed.
   *
   * Whenever a `second` task executed, the `first` one executed before it, unless they allowed to be executed
   * {@link makeParallel in parallel}.
   *
   * Contradictory execution order leads to unpredictable execution order.
   *
   * @param first - The task executed first.
   * @param second - The task executed after the first one.
   */
  order(this: void, first: ZTask, second: ZTask): void;

  /**
   * Registers the task execution entry. I.e. the task to be executed first before the task execution.
   *
   * This is necessary e.g. when the task is called as a prerequisite and another prerequisite precedes it.
   *
   * @param entry - The entry task.
   */
  addEntry(this: void, entry: ZTask): void;

  /**
   * Allows parallel tasks execution.
   *
   * The call to this method does not cause any of the tasks to be executed.
   *
   * @param tasks - Array of qualifiers of the tasks that can be executed in parallel to each other.
   */
  makeParallel(this: void, tasks: readonly ZTaskQualifier[]): void;

  /**
   * Allows parallel execution with the tasks matching the given criteria.
   *
   * This is a uni-directional check.
   *
   * @param task - The task qualifier to check parallelism of.
   * @param condition - Condition to check. This is a function accepting another task as its first parameter and
   * original task as the second one, and returning `true` when parallel execution is allowed for them.
   */
  makeParallelWhen(
    this: void,
    task: ZTaskQualifier,
    condition: (this: void, other: ZTask, task: ZTask) => boolean,
  ): void;
}

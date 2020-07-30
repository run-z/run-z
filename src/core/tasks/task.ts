/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZPackage } from '../packages';
import type { ZCall, ZCallDetails, ZPrePlanner, ZTaskExecution } from '../plan';
import type { ZTaskSpec } from './task-spec';

/**
 * Execution task.
 *
 * @typeparam TAction  Task action type.
 */
export interface ZTask<TAction extends ZTaskSpec.Action = ZTaskSpec.Action> extends ZTaskQualifier {

  /**
   * Target package the task is applied to.
   */
  readonly target: ZPackage;

  /**
   * Task name.
   */
  readonly name: string;

  /**
   * Task specifier.
   */
  readonly spec: ZTaskSpec<TAction>;

  /**
   * Initial details for {@link call calling} this task.
   */
  readonly callDetails: Required<ZCallDetails<TAction>>;

  /**
   * Plans a call to this task as a prerequisite of another one.
   *
   * By default a {@link ZTaskSpec.Group grouping task} treats the first argument as a sub-task name and the rest of
   * arguments as arguments to this sub-task. A task of any other type calls to itself.
   *
   * @param planner  A planner to record prerequisite call(s) to.
   * @param ref  Prerequisite task reference.
   *
   * @returns A promise resolved when prerequisite call planning completes.
   */
  callAsPre(planner: ZPrePlanner, ref: ZTaskSpec.TaskRef): PromiseLike<void>;

  /**
   * Plans this task execution as a top-level task.
   *
   * The plan would execute the task after executing all of its prerequisites.
   *
   * @typeparam TAction  Task action type.
   * @param details  Task call details.
   *
   * @returns A promise resolved to execution call of this task.
   *
   * @see ZPlanner.call
   */
  call(details?: ZCallDetails<TAction>): Promise<ZCall>;

  /**
   * Performs task execution.
   *
   * @param execution  Task execution context.
   *
   * @returns Either nothing when the task is executed synchronously, or a promise-like instance resolved when the task
   * executed asynchronously.
   */
  exec(execution: ZTaskExecution<TAction>): void | PromiseLike<unknown>;

}

/**
 * Task qualifier.
 *
 * Any task may have multiple qualifiers.
 *
 * Qualifiers are distinguished by their identity.
 */
export interface ZTaskQualifier {

  /**
   * Human- readable task qualifier.
   */
  readonly taskQN: string;

}

/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZPackage } from '../packages';
import type { ZCall, ZCallPlanner, ZTaskParams } from '../plan';
import type { ZTaskExecution } from '../plan/task-execution';
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
   * Builds initial task execution parameters.
   *
   * @returns Partial task execution parameters.
   */
  params(): ZTaskParams.Partial;

  /**
   * Plans this task execution.
   *
   * Records initial task execution instructions.
   *
   * @param planner  Task execution planner to record instructions to.
   *
   * @returns Either nothing when instructions recorded synchronously, or a promise-like instance resolved when
   * instructions recorded asynchronously.
   */
  plan(planner: ZCallPlanner<TAction>): void | PromiseLike<unknown>;

  /**
   * Represents this task as a prerequisite of another one.
   *
   * By default a {@link ZTaskSpec.Group grouping task} treats the first argument as a sub-task name and the rest of
   * arguments as arguments to this sub-task. A task of any other type returns a call to itself.
   *
   * @param planner  Depending task planner.
   * @param ref  Prerequisite task reference.
   *
   * @returns A promise resolved to iterable of prerequisite calls.
   */
  asPre(
      planner: ZCallPlanner,
      ref: ZTaskSpec.TaskRef,
  ): Promise<Iterable<ZCall>>;

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

/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZPackage } from '../packages';
import type { ZCall, ZCallInstruction, ZCallPlanner, ZTaskParams } from '../plan';
import type { ZTaskSpec } from './task-spec';

/**
 * Execution task.
 *
 * @typeparam TAction  Task action type.
 */
export abstract class ZTask<TAction extends ZTaskSpec.Action = ZTaskSpec.Action> {

  /**
   * Constructs a task.
   *
   * @param target  Target package the task is applied to.
   * @param name  Task name.
   * @param spec  Task specifier.
   */
  constructor(
      readonly target: ZPackage,
      readonly name: string,
      readonly spec: ZTaskSpec<TAction>,
  ) {
  }

  /**
   * Builds initial task execution parameters.
   *
   * @returns Partial task execution parameters.
   */
  abstract params(): ZTaskParams.Partial;

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
  abstract plan(planner: ZCallPlanner<TAction>): void | PromiseLike<unknown>;

  /**
   * Represents this task as a dependency of another one.
   *
   * By default a {@link ZTaskSpec.Group grouping task} treats the first argument as a sub-task name, an the rest of
   * arguments as arguments to this sub-task. The tasks of all other types record a call to this as is.
   *
   * @param call  Depending task execution call.
   * @param dep  Dependency specifier.
   *
   * @returns A potentially asynchronous iterable of {@link ZCallInstruction dependency call instructions}.
   */
  abstract asDepOf(
      call: ZCall,
      dep: ZTaskSpec.TaskRef,
  ): Iterable<ZCallInstruction> | AsyncIterable<ZCallInstruction>;

}

/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZPackage } from '../packages';
import type { ZCall, ZInstruction } from '../plan';
import type { ZTaskSpec } from './task-spec';

/**
 * Execution task.
 *
 * @typeparam TAction  Task action type.
 */
export abstract class ZTask<TAction extends ZTaskSpec.Action = ZTaskSpec.Action> {

  /**
   * Task fulfilment instruction.
   */
  abstract readonly instruction: ZInstruction;

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
   * Builds this task execution when it is used as dependency of another one.
   *
   * By default a {@link ZTaskSpec.Group grouping task} treats the first argument as a sub-task name, an the rest of
   * arguments as arguments to this sub-task. The tasks of all other types record a call to this as is.
   *
   * @param call  Depending task execution call.
   * @param dep  Dependency specifier.
   *
   * @returns Dependency execution instruction.
   */
  abstract asDepOf(call: ZCall, dep: ZTaskSpec.TaskRef): ZInstruction;

}

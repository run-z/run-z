/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZInstruction } from '../exec';
import type { ZPackage } from '../packages';
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
   * Whether this task accepts sub-task names as arguments.
   *
   * This is `true` for {@link ZTaskSpec.Command commands} and {@link ZTaskSpec.NoOp no-ops}, and `false`
   * for everything else.
   */
  abstract readonly acceptsSubTasks: boolean;

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

}

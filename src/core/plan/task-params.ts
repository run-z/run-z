/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZTaskSpec } from '../tasks';

/**
 * Parameters to task execution.
 */
export interface ZTaskParams {

  /**
   * Task attributes.
   */
  readonly attrs: ZTaskSpec.Attrs;

  /**
   * Command line arguments to pass to the task.
   */
  readonly args: readonly string[];

  /**
   * Command line arguments to pass to task action.
   *
   * E.g. {@link ZTaskSpec.Command.args command arguments}.
   */
  readonly actionArgs: readonly string[];

}

export namespace ZTaskParams {

  /**
   * Mutable task execution parameters.
   */
  export interface Mutable {

    /**
     * Task attributes.
     */
    attrs: Record<string, string[]>;

    /**
     * Command line arguments to pass to the task.
     */
    args: string[];

    /**
     * Command line arguments to pass to task action.
     */
    actionArgs: string[];

  }

}

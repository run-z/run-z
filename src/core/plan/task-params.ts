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

export const ZTaskParams = {

  extend(base: ZTaskParams, extension: ZTaskParams): ZTaskParams {
    return {
      attrs: { ...base.attrs, ...extension.attrs },
      args: base.args.concat(extension.args),
      actionArgs: base.args.concat(extension.args),
    };
  },

};

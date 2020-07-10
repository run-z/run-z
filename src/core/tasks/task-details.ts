/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZTaskSpec } from './task-spec';

export interface ZTaskDetails {

  readonly attrs: ZTaskSpec.Attrs;

  readonly args: readonly string[];

  readonly actionArgs: readonly string[];

}

export const ZTaskDetails = {

  extend(instruction: ZTaskDetails, extension: ZTaskDetails): ZTaskDetails {
    return {
      attrs: { ...instruction.attrs, ...extension.attrs },
      args: { ...instruction.args, ...extension.args },
      actionArgs: { ...instruction.args, ...extension.args },
    };
  },

};

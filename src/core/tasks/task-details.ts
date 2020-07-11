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

  extend(base: ZTaskDetails, extension: ZTaskDetails): ZTaskDetails {
    return {
      attrs: { ...base.attrs, ...extension.attrs },
      args: base.args.concat(extension.args),
      actionArgs: base.args.concat(extension.args),
    };
  },

};

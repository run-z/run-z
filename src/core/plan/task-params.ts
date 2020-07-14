/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZTaskSpec } from '../tasks';

/**
 * @internal
 */
const falseZAttrValues: { [key: string]: 1 } = {
  0: 1,
  off: 1,
  false: 1,
};

/**
 * Parameters to task execution.
 */
export class ZTaskParams {

  /**
   * Updates mutable task execution parameters with the given partial update.
   *
   * @param params  Parameters to update.
   * @param update  Partial update of parameters.
   *
   * @returns Updated parameters (`params` argument).
   */
  static update(
      params: ZTaskParams.Mutable,
      update: ZTaskParams.Partial,
  ): ZTaskParams.Mutable {

    const { attrs = {}, args = [], actionArgs = [] } = update;

    for (const [k, v] of Object.entries(attrs)) {

      const values = params.attrs[k];

      if (values) {
        values.push(...v);
      } else {
        params.attrs[k] = Array.from(v);
      }
    }
    params.args.push(...args);
    params.actionArgs.push(...actionArgs);

    return params;
  }

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

  /**
   * Constructs task execution parameters.
   *
   * @param init  Initial task execution parameter values.
   */
  constructor(init: ZTaskParams.Values) {
    this.attrs = init.attrs;
    this.args = init.args;
    this.actionArgs = init.actionArgs;
  }

  /**
   * Returns the most recent attribute value.
   *
   * @param name  Attribute name.
   *
   * @returns The most recent (last) attribute value, or `undefined` if attribute is not set.
   */
  attr(name: string): string | undefined {

    const values = this.attrs[name];

    return values && values[values.length - 1];
  }

  /**
   * Checks whether the given flag attribute set.
   *
   * @param name  Flag attribute name.
   *
   * @returns `true` if attribute with the given name is set, and its most recent lower-cased value value is not one of
   * `0`, `false`, or `off`. `false` otherwise.
   */
  flag(name: string): boolean {

    const attr = this.attr(name)?.toLowerCase();

    return attr != null && falseZAttrValues[attr] !== 1;
  }

  /**
   * Builds a mutable representation of this parameters instance.
   *
   * @returns A mutable task execution parameters containing this parameters values.
   */
  mutate(): ZTaskParams.Mutable {

    const result: ZTaskParams.Mutable = { attrs: {}, args: [], actionArgs: [] };

    ZTaskParams.update(result, this);

    return result;
  }

  /**
   * Extends task execution parameters.
   *
   * @param extension  Task parameters extension.
   *
   * @returns Task execution parameters containing these parameter values updated with the given `extension`.
   */
  extend(extension: ZTaskParams.Partial): ZTaskParams {
    return new ZTaskParams(ZTaskParams.update(this.mutate(), extension));
  }

}

export namespace ZTaskParams {

  /**
   * Task execution parameter values.
   */
  export type Values = Required<Partial>;

  /**
   * Partial task execution parameters.
   */
  export interface Partial {

    /**
     * Task attributes.
     */
    readonly attrs?: ZTaskSpec.Attrs;

    /**
     * Command line arguments to pass to the task.
     */
    readonly args?: readonly string[];

    /**
     * Command line arguments to pass to task action.
     *
     * E.g. {@link ZTaskSpec.Command.args command arguments}.
     */
    readonly actionArgs?: readonly string[];

  }

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

/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZTaskSpec } from '../tasks';

/**
 * @internal
 */
const falseZTaskFlagValues: { [key: string]: 1 } = {
  0: 1,
  off: 1,
  false: 1,
};

/**
 * @internal
 */
let emptyZTaskParams: ZTaskParams | undefined;

/**
 * Task execution parameters.
 */
export class ZTaskParams {

  static get empty(): ZTaskParams {
    return emptyZTaskParams || (emptyZTaskParams = new ZTaskParams(ZTaskParams.newMutable()));
  }

  /**
   * Creates new mutable task execution parameters.
   */
  static newMutable(): ZTaskParams.Mutable {
    return { attrs: {}, args: [] };
  }

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
      update: ZTaskParams.Partial = {},
  ): ZTaskParams.Mutable {

    const { attrs = {}, args = [] } = update;

    for (const [k, v] of Object.entries(attrs)) {
      if (!v) {
        continue;
      }

      const values = params.attrs[k];

      if (values) {
        values.push(...v);
      } else {
        params.attrs[k] = Array.from(v) as [string, ...string[]];
      }
    }
    params.args.push(...args);

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
   * Constructs task execution parameters.
   *
   * @param values  Task execution parameter values.
   */
  constructor(values: ZTaskParams.Values) {
    this.attrs = values.attrs;
    this.args = values.args;
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

    const attr = this.attr(name);

    return attr != null && !falseZTaskFlagValues[attr.toLowerCase()];
  }

  /**
   * Builds a mutable representation of this parameters instance.
   *
   * @returns A mutable task execution parameters containing this parameters values.
   */
  mutate(): ZTaskParams.Mutable {
    return ZTaskParams.update(ZTaskParams.newMutable(), this);
  }

  /**
   * Extends task execution parameters.
   *
   * @param extension  Task parameters extension.
   *
   * @returns Task execution parameters containing these parameter values updated with the given `extension`.
   */
  extend(extension: ZTaskParams.Partial | undefined): ZTaskParams {
    return new ZTaskParams(ZTaskParams.update(this.mutate(), extension));
  }

  /**
   * Extends task execution attributes.
   *
   * @param extension  Task parameters extension.
   *
   * @returns Task execution parameters containing these parameter attributes updated with the given `extension`.
   */
  extendAttrs(extension: ZTaskParams.Partial | undefined): ZTaskParams {

    const params = this.mutate();

    params.args = [];

    return new ZTaskParams(ZTaskParams.update(params, extension));
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

  }

  /**
   * Mutable task execution parameters.
   */
  export interface Mutable {

    /**
     * Task attributes.
     */
    attrs: Record<string, [string, ...string[]]>;

    /**
     * Command line arguments to pass to the task.
     */
    args: string[];

  }

}

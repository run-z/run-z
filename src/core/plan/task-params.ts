/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZTaskSpec } from '../tasks';
import type { ZCall } from './call';

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

  /**
   * Empty task parameters.
   */
  static get empty(): ZTaskParams {
    return emptyZTaskParams || (emptyZTaskParams = new ZTaskParams(ZTaskParams.newMutable()));
  }

  /**
   * Creates task parameters evaluation context.
   *
   * @returns New task parameters evaluation context instance.
   */
  static newEvaluator(): ZTaskParams.Evaluator {

    const evaluated = new Map<unknown, Map<ZCall, any>>();

    return {

      paramsOf(source: ZCall, params: (this: void) => ZTaskParams): ZTaskParams {
        return this.valueOf(ZTaskParams, source, params);
      },

      valueOf<TValue>(key: ZTaskParams.ValueKey<TValue>, source: ZCall, evaluate: (this: void) => TValue): TValue {

        let cache = evaluated.get(key);

        if (cache) {

          const cached = cache.get(source);

          if (cached !== undefined) {
            return cached;
          }
        } else {
          evaluated.set(key, cache = new Map());
        }

        // Prevent infinite recursion.
        cache.set(source, key.empty);

        const newValue = evaluate();

        cache.set(source, newValue);

        return newValue;
      },

    };
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

  /**
   * Task parameters builder signature.
   */
  export type Fn =
  /**
   * @param evaluator  Task parameters evaluation context.
   *
   * @returns Evaluated task parameters.
   */
      (this: void, evaluator: Evaluator) => ZTaskParams;

  /**
   * Task parameters evaluation context.
   *
   * It is passed to task parameter evaluators to prevent infinite recursion and to cache already evaluated results.
   */
  export interface Evaluator {

    /**
     * Evaluates parameters of the given task call.
     *
     * @param source  The task call the parameters evaluated from.
     * @param params  The task parameters builder function. It is called unless a recursion detected.
     *
     * @returns Evaluated task parameters, or empty ones if recursion detected.
     */
    paramsOf(source: ZCall, params: (this: void) => ZTaskParams): ZTaskParams;

    /**
     * Evaluates a value for the given task call.
     *
     * @typeparam TValue  Value type.
     * @param key  Value key.
     * @param source  The task call the value evaluated for.
     * @param evaluate  The value evaluation function. It is called unless a recursion detected.
     *
     * @returns Evaluated value, or {@link ValueKey.empty empty one} if recursion detected.
     */
    valueOf<TValue>(key: ValueKey<TValue>, source: ZCall, evaluate: (this: void) => TValue): TValue;

  }

  /**
   * A key of the value evaluated per the task call.
   *
   * @typeparam TValue  Value type.
   */
  export interface ValueKey<TValue> {

    /**
     * Empty value used when recursion detected.
     */
    readonly empty: TValue;

  }

}

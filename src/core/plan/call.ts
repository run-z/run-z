/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZTask, ZTaskSpec } from '../tasks';
import type { ZTaskParams } from './task-params';

/**
 * A call for task execution.
 *
 * @typeparam TAction  Task action type.
 */
export class ZCall<TAction extends ZTaskSpec.Action = ZTaskSpec.Action> {

  private readonly _params: (readonly [ZCallParams, ZCallDepth])[];

  /**
   * Constructs a call for task execution.
   *
   * @param task  A task to call.
   * @param params  A function evaluating parameters of the call.
   * @param depth  A function evaluating the depth of the call.
   */
  constructor(readonly task: ZTask<TAction>, params: ZCallParams, depth: ZCallDepth) {
    this._params = [[params, depth]];
  }

  /**
   * Refines the call by adding more parameters to it.
   *
   * @param params  A function evaluating additional parameters of the call.
   * @param depth  A function evaluating the depth of the additional call.
   *
   * @returns `this` instance.
   */
  refine(params: ZCallParams, depth: ZCallDepth): this {
    this._params.push([params, depth]);
    return this;
  }

  /**
   * Evaluates task execution parameters.
   *
   * @returns Mutable task execution parameters instance.
   */
  params(): ZTaskParams.Mutable {

    // Sort the calls from deepest to closest.
    const allParams = this._params.map(
        ([params, depth]) => [depth(), params] as const,
    ).sort(
        ([firstDepth], [secondDepth]) => secondDepth - firstDepth,
    );

    // Evaluate parameters.
    const result: ZTaskParams.Mutable = { attrs: {}, args: [], actionArgs: [] };

    for (const [, params] of allParams) {
      extendZTaskParams(result, params());
    }

    return result;
  }

  /**
   * Extends this call parameters with the given extension.
   *
   * @param extension  Task parameters extension.
   *
   * @returns Evaluator of extended mutable task parameters.
   */
  extendParams(extension: Partial<ZTaskParams>): (this: void) => ZTaskParams.Mutable {
    return () => extendZTaskParams(this.params(), extension);
  }

}

/**
 * Task execution parameters evaluator signature.
 */
export type ZCallParams =
/**
 * @returns Partial task execution parameters.
 */
    (this: void) => Partial<ZTaskParams>;

/**
 * Task execution call depth evaluator signature.
 *
 * This is a function that evaluates the depth of the call. The higher the call depth, the less the priority of
 * the {@link ZTaskParams call parameters} is.
 */
export type ZCallDepth =
/**
 * @returns The depth of the call.
 */
    (this: void) => number;

/**
 * @internal
 */
function extendZTaskParams(
    params: ZTaskParams.Mutable,
    { attrs = {}, args = [], actionArgs = [] }: Partial<ZTaskParams>,
): ZTaskParams.Mutable {
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

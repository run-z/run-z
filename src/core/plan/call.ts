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
   * @returns Task execution parameters.
   */
  params(): ZTaskParams {

    // Sort the calls from deepest to closest.
    const allParams = this._params.map(
        ([params, depth]) => [depth(), params] as const,
    ).sort(
        ([firstDepth], [secondDepth]) => secondDepth - firstDepth,
    );

    // Evaluate parameters.
    const attrs: Record<string, string[]> = {};
    const args: string[] = [];
    const actionArgs: string[] = [];

    for (const [, params] of allParams) {

      const { attrs: newAttrs = {}, args: newArgs = [], actionArgs: newActionArgs = [] } = params();

      Object.assign(attrs, newAttrs);
      args.push(...newArgs);
      actionArgs.push(...newActionArgs);
    }

    return {
      attrs,
      args,
      actionArgs,
    };
  }

  /**
   * Extends this call parameters with the given extension.
   *
   * @param extension  Task parameters extension.
   *
   * @returns Extended task parameters evaluator function.
   */
  extendParams(extension: Partial<ZTaskParams>): (this: void) => ZTaskParams {

    const { attrs = {}, args = [], actionArgs = [] } = extension;

    return () => {

      const base = this.params();

      return ({
        attrs: { ...base.attrs, ...attrs },
        args: base.args.concat(args),
        actionArgs: base.args.concat(actionArgs),
      });
    };
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

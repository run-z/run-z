import type { ZTask, ZTaskSpec } from '../tasks';
import type { ZCall, ZCallDepth, ZCallParams } from './call';
import type { ZTaskParams } from './task-params';

/**
 * @internal
 */
export class ZCallRecord<TAction extends ZTaskSpec.Action = ZTaskSpec.Action> implements ZCall<TAction> {

  private readonly _params: (readonly [ZCallParams, ZCallDepth])[];

  constructor(readonly task: ZTask<TAction>, params: ZCallParams, depth: ZCallDepth) {
    this._params = [[params, depth]];
  }

  call(params: ZCallParams, depth: ZCallDepth): this {
    this._params.push([params, depth]);
    return this;
  }

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

  extendParams(extension: Partial<ZTaskParams>): (this: void) => ZTaskParams.Mutable {
    return () => extendZTaskParams(this.params(), extension);
  }

}

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

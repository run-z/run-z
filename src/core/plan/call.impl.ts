import type { ZTask, ZTaskSpec } from '../tasks';
import type { ZCall, ZCallDepth, ZCallParams } from './call';
import { ZTaskParams } from './task-params';

/**
 * @internal
 */
export interface ZPlanRecords {

  readonly rev: number;

  requiredBy(dependent: ZTask): Iterable<ZCall>;

  areParallel(first: ZTask, second: ZTask): boolean;

}

/**
 * @internal
 */
export class ZCallRecord<TAction extends ZTaskSpec.Action = ZTaskSpec.Action> implements ZCall<TAction> {

  private readonly _params: (readonly [ZCallParams, ZCallDepth])[];
  private _builtParams: readonly [number, ZTaskParams] | [] = [];

  constructor(
      private readonly _plan: ZPlanRecords,
      readonly task: ZTask<TAction>,
      params: ZCallParams,
      depth: ZCallDepth,
  ) {
    this._params = [[params, depth]];
  }

  call(params: ZCallParams, depth: ZCallDepth): this {
    this._params.push([params, depth]);
    return this;
  }

  params(): ZTaskParams {

    const [rev, cached] = this._builtParams;

    if (rev === this._plan.rev) {
      return cached as ZTaskParams;
    }

    // Sort the calls from deepest to closest.
    const allParams = this._params.map(
        ([params, depth]) => [depth(), params] as const,
    ).sort(
        ([firstDepth], [secondDepth]) => secondDepth - firstDepth,
    );

    // Evaluate parameters.
    const result: ZTaskParams.Mutable = { attrs: {}, args: [], actionArgs: [] };

    for (const [, params] of allParams) {
      ZTaskParams.update(result, params());
    }

    const params = new ZTaskParams(result);

    this._builtParams = [this._plan.rev, params];

    return params;
  }

  extendParams(extension: ZTaskParams.Partial): (this: void) => ZTaskParams {
    return () => this.params().extend(extension);
  }

  required(): Iterable<ZCall> {
    return this._plan.requiredBy(this.task);
  }

  parallelWith(other: ZTask): boolean {
    return this._plan.areParallel(this.task, other);
  }

}

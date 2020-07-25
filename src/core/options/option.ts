/**
 * @packageDocumentation
 * @module run-z
 */

export type SupportedZOptions<TCtx, TSrc extends ZOptionSource> =
    | SupportedZOptions.Map<TSrc>
    | SupportedZOptions.Provider<TCtx, TSrc>
    | readonly (SupportedZOptions.Map<TSrc> | SupportedZOptions.Provider<TCtx, TSrc>)[];

export namespace SupportedZOptions {

  export interface Map<TSrc extends ZOptionSource> {

    readonly [option: string]: ZOptionReader<TSrc, this> | undefined;

  }

  export type Provider<TCtx, TSrc extends ZOptionSource> =
      (this: void, context: TCtx) => Map<TSrc> | PromiseLike<Map<TSrc>>;

}

export type ZOptionReader<TSrc extends ZOptionSource, TThis = void> =
    (this: TThis, source: TSrc) => void | PromiseLike<unknown>;

export abstract class ZOptionSource {

  abstract readonly option: string;

  abstract values(numArgs?: number): readonly string[];

  abstract rest(): readonly string[];

  abstract defer(whenRecognized?: ZOptionReader<this>): void;

  protected recognized(_values: readonly string[]): void {
    // nothing by default
  }

}

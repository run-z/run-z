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

export interface ZOptionSource {

  readonly option: string;

  values(numArgs?: number): readonly string[];

  rest(): readonly string[];

  defer(whenRecognized?: ZOptionReader<this>): void;

  whenRecognized(receiver: (this: void, values: readonly string[]) => void): void;

}

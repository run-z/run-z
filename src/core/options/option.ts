/**
 * @packageDocumentation
 * @module run-z
 */

export type SupportedZOptions<TCtx, TSrc extends ZOptionSource> =
  | ZOptionsMap<TSrc>
  | ZOptionsSupport<TCtx, TSrc>;

export interface ZOptionsMap<TSrc extends ZOptionSource> {

  readonly [option: string]: ZOptionReader<TSrc, this> | undefined;

}

export type ZOptionsSupport<TCtx, TSrc extends ZOptionSource> =
    (this: void, context: TCtx) => ZOptionsMap<TSrc> | PromiseLike<ZOptionsMap<TSrc>>;

export type ZOptionReader<TSrc extends ZOptionSource, TThis = void> =
    (this: TThis, source: TSrc) => void | PromiseLike<unknown>;

export abstract class ZOptionSource {

  abstract readonly option: string;

  abstract values(numArgs?: number): readonly string[];

  abstract rest(): readonly string[];

  abstract skip(whenRecognized?: ZOptionReader<this>): void;

  protected recognized(_values: readonly string[]): void {
    // nothing by default
  }

}

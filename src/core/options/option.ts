/**
 * @packageDocumentation
 * @module run-z
 */

export type SupportedZOptions<TCtx, TOption extends ZOption> =
    | SupportedZOptions.Map<TOption>
    | SupportedZOptions.Provider<TCtx, TOption>
    | readonly (SupportedZOptions.Map<TOption> | SupportedZOptions.Provider<TCtx, TOption>)[];

export namespace SupportedZOptions {

  export interface Map<TOption extends ZOption> {

    readonly [option: string]: ZOptionReader<TOption, this> | undefined;

    readonly '--*'?: ZOptionReader<TOption, this>;

    readonly '*'?: ZOptionReader<TOption, this>;

  }

  export type Provider<TCtx, TOption extends ZOption> =
      (this: void, context: TCtx) => Map<TOption> | PromiseLike<Map<TOption>>;

}

export type ZOptionReader<TOption extends ZOption, TThis = void> =
    (this: TThis, option: TOption) => void | PromiseLike<unknown>;

export interface ZOption {

  readonly name: string;

  values(max?: number): readonly string[];

  rest(): readonly string[];

  defer(whenRecognized?: ZOptionReader<this>): void;

  whenRecognized(receiver: (this: void, option: this) => void): void;

}

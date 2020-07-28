/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZOption, ZOptionReader } from './option';

/**
 * A set of options supported by {@link ZOptionsParser parser}.
 *
 * This is either a {@link SupportedZOptions.Map map of option readers}, its {@link SupportedZOptions.Provider provider
 * function}, or an array of the above. Multiple readers may be specified per option key with the latter.
 *
 * @typeparam TOption  A type of option representation.
 * @typeparam TCtx  A type of option processing context required by parser.
 */
export type SupportedZOptions<TOption extends ZOption = ZOption, TCtx = unknown> =
    | SupportedZOptions.Map<TOption>
    | SupportedZOptions.Provider<TOption, TCtx>
    | readonly (SupportedZOptions.Map<TOption> | SupportedZOptions.Provider<TOption, TCtx>)[];

export namespace SupportedZOptions {

  /**
   * A map of {@link ZOptionReader readers} corresponding to option keys or their wildcards.
   *
   * @typeparam TCtx  A type of option processing context required by parser.
   * @typeparam TOption  A type of option representation.
   */
  export interface Map<TOption extends ZOption = ZOption> {

    /**
     * Option reader method corresponding to option key.
     *
     * The latter can be either an option name, or its wildcard supported by the {@link ZOptionSyntax syntax} used.
     */
    readonly [key: string]: ZOptionReader<TOption, this> | undefined;

    /**
     * Fallback option reader consulted when none of the readers recognized the option in
     * {@link ZOptionSyntax.longOptions long syntax}.
     */
    readonly '--*'?: ZOptionReader<TOption, this>;

    /**
     * Fallback option reader consulted when none of the readers recognized the option in
     * {@link ZOptionSyntax.shortOptions one-letter syntax}.
     */
    readonly '-?'?: ZOptionReader<TOption, this>;

    /**
     * Fallback option reader consulted when none of the readers recognized the option in
     * {@link ZOptionSyntax.shortOptions short syntax}.
     */
    readonly '-*'?: ZOptionReader<TOption, this>;

    /**
     * Fallback option reader consulted when none of the readers the option in {@link ZOptionSyntax.any any syntax}.
     */
    readonly '*'?: ZOptionReader<TOption, this>;

  }

  /**
   * Options syntax provider signature.
   *
   * The provider is called by options parser at once per {@link ZOptionsParser.parseOptions parse request}.
   *
   * @typeparam TCtx  A type of option processing context required by parser.
   * @typeparam TOption  A type of option representation.
   */
  export type Provider<TOption extends ZOption = ZOption, TCtx = unknown> =
  /**
   * @param context  Option processing context.
   *
   * @returns A {@link Map map of option readers}.
   */
      (this: void, context: TCtx) => Map<TOption>;

}

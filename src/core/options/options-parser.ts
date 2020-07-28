/**
 * @packageDocumentation
 * @module run-z
 */
import type { ZOption } from './option';
import type { ZOptionSyntax } from './option-syntax';
import { ZOptionsParser$ } from './options-parser.impl';
import type { SupportedZOptions } from './supported-options';

/**
 * Command line options parser signature.
 *
 * @typeparam TOption  A type of option representation.
 * @typeparam TCtx  Option processing context required by parser and the type of parser result.
 */
export type ZOptionsParser<TCtx> =
/**
 * @param context  Options processing context. This context is supposed to receive the processing results.
 * @param args  Array of command line arguments
 * @param fromIndex  An index of command line argument to start processing from.
 *
 * @returns A promise resolved to processing context when parsing completes.
 */
    (
        this: void,
        context: TCtx,
        args: readonly string[],
        fromIndex?: number,
    ) => Promise<TCtx>;

export namespace ZOptionsParser {

  /**
   * Command line options parser configuration.
   *
   * @typeparam TOption  A type of option representation.
   * @typeparam TCtx  Option processing context required by parser.
   */
  export interface Config<TOption extends ZOption, TCtx> {

    /**
     * Supported command line options.
     */
    readonly options: SupportedZOptions<TOption, TCtx>;

    /**
     * Supported command line syntax.
     *
     * @default {@link ZOptionSyntax.default}
     */
    readonly syntax?: ZOptionSyntax | readonly ZOptionSyntax[];

    /**
     * Builds command line option representation class.
     *
     * @param base  Base option representation class.
     *
     * @returns Command line option representation class constructor.
     */
    optionClass<TArgs extends any[]>(
        base: ZOption.BaseClass<TArgs>,
    ): ZOption.ImplClass<TOption, TCtx, TArgs>;

  }

}

/**
 * Builds custom command line options parser.
 *
 * @typeparam TOption  A type of option representation.
 * @typeparam TCtx  Option processing context required by parser and the type of parser result.
 * @param config  Parser configuration.
 *
 * @returns New options parser.
 */
export function customZOptionsParser<TOption extends ZOption, TCtx>(
    config: ZOptionsParser.Config<TOption, TCtx>,
): ZOptionsParser<TCtx> {

  const parser = new ZOptionsParser$(config);

  return parser.parseOptions.bind(parser);
}
